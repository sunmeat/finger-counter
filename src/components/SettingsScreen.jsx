import { useRef, useState } from "react";
import { CHORD_TYPES, GESTURE_ACTIONS, completeGestureLayout, normalizeGestures, validateGestures } from "../domain/customGestures.js";
import { HANDEDNESS } from "../domain/constants.js";
import { INSTRUMENTS } from "../domain/piano.js";
import Segmented from "./controls/Segmented.jsx";
import AppHeader from "./layout/AppHeader.jsx";
import "./styles/SettingsScreen.css";

const FINGERS = ["Великий", "Вказівний", "Середній", "Безіменний", "Мізинець"];
const SIDES = [
    { id: "left", title: "Ліва рука", description: "32 комбінації. За замовчуванням ліва рука задає ноти." },
    { id: "right", title: "Права рука", description: "32 комбінації. За замовчуванням права рука вибирає акорди." },
];
const NOTE_OPTIONS = Array.from({ length: 37 }, (_, index) => ({ value: index + 48, label: midiName(index + 48) }));

function midiName(midi) {
    const names = ["До", "До♯", "Ре", "Ре♯", "Мі", "Фа", "Фа♯", "Соль", "Соль♯", "Ля", "Ля♯", "Сі"];
    return names[midi % 12] + (Math.floor(midi / 12) - 1);
}

function labelFor(mask) {
    const fingers = FINGERS.filter((_, index) => mask[index] === "1");
    return fingers.length ? fingers.join(" + ") : "Усі пальці зігнуті";
}

function actionLabel(gesture) {
    if (gesture.type === "default") return "Стандартна поведінка";
    if (gesture.type === "note") return "Нота";
    if (gesture.type === "chord") return "Акорд";
    return GESTURE_ACTIONS.find(({ id }) => id === gesture.type)?.name ?? gesture.type;
}

export default function SettingsScreen(props) {
    const { dominant, onPickDominant, gestures, onSaveGestures, onBack, onOpenPiano, onOpenTrainer, onOpenSettings } = props;
    const [draft, setDraft] = useState(() => completeGestureLayout(gestures));
    const [message, setMessage] = useState("");
    const fileRef = useRef(null);
    const conflicts = validateGestures(draft);

    const update = (id, patch) => setDraft((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));

    const exportJson = () => {
        const payload = { version: 2, combinationCount: 32, sides: ["left", "right"], gestures: completeGestureLayout(draft) };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "aerodion-gesture-layout.json";
        link.click();
        URL.revokeObjectURL(url);
        setMessage("Експортовано 64 комбінації: по 32 для кожної руки.");
    };

    const importJson = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const parsed = JSON.parse(await file.text());
            const imported = normalizeGestures(parsed.gestures ?? parsed);
            setDraft(imported);
            setMessage("Усі 64 комбінації перевірені та завантажені. Натисніть кнопку «Зберегти розкладку», щоб застосувати зміни.");
        } catch (error) {
            setMessage(error.message || "Неможливо прочитати JSON.");
        } finally {
            event.target.value = "";
        }
    };

    const resetDefaults = () => {
        const defaults = completeGestureLayout([]);
        setDraft(defaults);
        onPickDominant("right");
        onSaveGestures(defaults);
        setMessage("Відновлено стандартні дії для всіх 64 комбінацій та режим правші.");
    };

    const save = () => {
        if (conflicts.size || draft.length !== 64) {
            setMessage("Розкладка повинна містити рівно 64 унікальні комбінації: 32 на кожну руку.");
            return;
        }
        onSaveGestures(completeGestureLayout(draft));
        setMessage("Усі 64 комбінації збережені на цьому пристрої.");
    };

    return (
        <main className="settings-screen">
            <AppHeader
                {...props}
                title="Налаштування"
                lede="Усі 32 комбінації для кожної руки. Експорт та імпорт зберігають повну розкладку."
                activeSection="settings"
            />

            <section className="settings-card">
                <div className="settings-section-title"><span>01</span><div><h2>Провідна рука</h2><p>Змінює розподіл ролей: одна рука задає ноту, інша вибирає акорд.</p></div></div>
                <Segmented label="Провідна рука" options={HANDEDNESS} value={dominant} onChange={onPickDominant} />
            </section>

            <section className="settings-card">
                <div className="settings-section-title"><span>02</span><div><h2>Повна розкладка жестів</h2><p>Кожна комбінація пальців є рівно один раз для лівої і один раз для правої руки. "Стандартна поведінка" залишає вихідну логіку програми.</p></div></div>
                <div className="settings-actions settings-top-actions">
                    <button type="button" className="settings-primary" onClick={save}>Зберегти розкладку</button>
                    <button type="button" className="settings-secondary" onClick={exportJson}>Експорт JSON (64)</button>
                    <button type="button" className="settings-secondary" onClick={() => fileRef.current?.click()}>Імпорт JSON (64)</button>
                    <button type="button" className="settings-danger" onClick={resetDefaults}>Скинути за замовчуванням</button>
                    <input ref={fileRef} className="settings-file" type="file" accept="application/json,.json" onChange={importJson} />
                </div>

                {SIDES.map((side) => (
                    <section className="gesture-side" key={side.id}>
                        <header className="gesture-side-header">
                            <div><h3>{side.title}</h3><p>{side.description}</p></div>
                            <span>{draft.filter((gesture) => gesture.side === side.id).length} / 32</span>
                        </header>
                        <div className="gesture-list">
                            {draft.filter((gesture) => gesture.side === side.id).map((gesture, index) => (
                                <article className={conflicts.has(gesture.side + ":" + gesture.mask) ? "gesture-row conflict" : "gesture-row"} key={gesture.id}>
                                    <div className="gesture-number">{String(index + 1).padStart(2, "0")}</div>
                                    <div className="gesture-combination">
                                        <strong>{labelFor(gesture.mask)}</strong>
                                        <code>{gesture.mask}</code>
                                    </div>
                                    <div className="gesture-fields">
                                        <label>Дія
                                            <select value={gesture.type} onChange={(event) => update(gesture.id, { type: event.target.value, target: event.target.value === "note" ? 60 : event.target.value === "chord" ? "major" : event.target.value === "instrument" ? "accordion" : "" })}>
                                                <option value="default">Стандартна поведінка</option>
                                                <option value="note">Зіграти ноту</option>
                                                <option value="chord">Зіграти акорд</option>
                                                {GESTURE_ACTIONS.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
                                            </select>
                                        </label>
                                        {gesture.type === "note" && <label>Нота<select value={gesture.target} onChange={(event) => update(gesture.id, { target: Number(event.target.value) })}>{NOTE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>}
                                        {gesture.type === "chord" && <label>Акорд<select value={gesture.target} onChange={(event) => update(gesture.id, { target: event.target.value })}>{CHORD_TYPES.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}</select></label>}
                                        {gesture.type === "instrument" && <label>Інструмент<select value={gesture.target} onChange={(event) => update(gesture.id, { target: event.target.value })}>{INSTRUMENTS.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}</select></label>}
                                    </div>
                                    <div className="gesture-foot"><span>{actionLabel(gesture)}</span></div>
                                </article>
                            ))}
                        </div>
                    </section>
                ))}

                {message && <p className="settings-message" role="status">{message}</p>}
                <p className="settings-note">JSON файл повинен містити всі 64 записи: кожну з 32 комбінацій для обох рук. Неповний або дубльований файл не імпортується.</p>
            </section>
        </main>
    );
}
