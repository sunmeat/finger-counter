import { useRef, useState } from "react";
import { CHORD_TYPES, GESTURE_ACTIONS, completeGestureLayout, normalizeGestures, validateGestures } from "../domain/customGestures.js";
import { HANDEDNESS } from "../domain/constants.js";
import { INSTRUMENTS } from "../domain/piano.js";
import Segmented from "./controls/Segmented.jsx";
import "./styles/SettingsScreen.css";

const FINGERS = ["Большой", "Указательный", "Средний", "Безымянный", "Мизинец"];
const SIDES = [
    { id: "left", title: "Левая рука", description: "32 комбинации. По умолчанию левая рука задаёт ноты." },
    { id: "right", title: "Правая рука", description: "32 комбинации. По умолчанию правая рука выбирает аккорды." },
];
const NOTE_OPTIONS = Array.from({ length: 37 }, (_, index) => ({ value: index + 48, label: midiName(index + 48) }));

function midiName(midi) {
    const names = ["До", "До♯", "Ре", "Ре♯", "Ми", "Фа", "Фа♯", "Соль", "Соль♯", "Ля", "Ля♯", "Си"];
    return names[midi % 12] + (Math.floor(midi / 12) - 1);
}

function labelFor(mask) {
    const fingers = FINGERS.filter((_, index) => mask[index] === "1");
    return fingers.length ? fingers.join(" + ") : "Все пальцы согнуты";
}

function actionLabel(gesture) {
    if (gesture.type === "default") return "Стандартное поведение";
    if (gesture.type === "note") return "Нота";
    if (gesture.type === "chord") return "Аккорд";
    return GESTURE_ACTIONS.find(({ id }) => id === gesture.type)?.name ?? gesture.type;
}

export default function SettingsScreen({ dominant, onPickDominant, gestures, onSaveGestures, onBack, onOpenPiano, onOpenTrainer, onOpenSettings }) {
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
        setMessage("Экспортировано 64 комбинации: по 32 для каждой руки.");
    };

    const importJson = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const parsed = JSON.parse(await file.text());
            const imported = normalizeGestures(parsed.gestures ?? parsed);
            setDraft(imported);
            setMessage("Все 64 комбинации проверены и загружены. Нажмите «Сохранить раскладку», чтобы применить изменения.");
        } catch (error) {
            setMessage(error.message || "Не удалось прочитать JSON.");
        } finally {
            event.target.value = "";
        }
    };

    const resetDefaults = () => {
        const defaults = completeGestureLayout([]);
        setDraft(defaults);
        onPickDominant("right");
        onSaveGestures(defaults);
        setMessage("Восстановлены стандартные действия для всех 64 комбинаций и режим правши.");
    };

    const save = () => {
        if (conflicts.size || draft.length !== 64) {
            setMessage("Раскладка должна содержать ровно 64 уникальные комбинации: 32 на каждую руку.");
            return;
        }
        onSaveGestures(completeGestureLayout(draft));
        setMessage("Все 64 комбинации сохранены на этом устройстве.");
    };

    return (
        <main className="settings-screen">
            <header className="settings-header">
                <div>
                    <p className="settings-eyebrow">AERODION / ПЕРСОНАЛИЗАЦИЯ</p>
                    <h1>Настройки</h1>
                    <p>Все 32 комбинации для каждой руки. Экспорт и импорт сохраняют полную раскладку.</p>
                </div>
                <nav className="section-nav" aria-label="Основные разделы">
                    <button type="button" className="section-nav-link" onClick={onOpenPiano}>🏠 Главная</button>
                    <button type="button" className="section-nav-link" onClick={onOpenTrainer}>📚 Обучение</button>
                    <button type="button" className="section-nav-link is-active" aria-current="page" onClick={onOpenSettings}>⚙ Настройки</button>
                </nav>
            </header>

            <section className="settings-card">
                <div className="settings-section-title"><span>01</span><div><h2>Ведущая рука</h2><p>Меняет распределение ролей: одна рука задаёт ноту, другая выбирает аккорд.</p></div></div>
                <Segmented label="Ведущая рука" options={HANDEDNESS} value={dominant} onChange={onPickDominant} />
            </section>

            <section className="settings-card">
                <div className="settings-section-title"><span>02</span><div><h2>Полная раскладка жестов</h2><p>Каждая комбинация пальцев присутствует ровно один раз для левой и один раз для правой руки. «Стандартное поведение» оставляет исходную логику приложения.</p></div></div>
                <div className="settings-actions settings-top-actions">
                    <button type="button" className="settings-primary" onClick={save}>Сохранить раскладку</button>
                    <button type="button" className="settings-secondary" onClick={exportJson}>Экспорт JSON (64)</button>
                    <button type="button" className="settings-secondary" onClick={() => fileRef.current?.click()}>Импорт JSON (64)</button>
                    <button type="button" className="settings-danger" onClick={resetDefaults}>Сбросить по умолчанию</button>
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
                                        <label>Действие
                                            <select value={gesture.type} onChange={(event) => update(gesture.id, { type: event.target.value, target: event.target.value === "note" ? 60 : event.target.value === "chord" ? "major" : event.target.value === "instrument" ? "accordion" : "" })}>
                                                <option value="default">Стандартное поведение</option>
                                                <option value="note">Сыграть ноту</option>
                                                <option value="chord">Сыграть аккорд</option>
                                                {GESTURE_ACTIONS.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
                                            </select>
                                        </label>
                                        {gesture.type === "note" && <label>Нота<select value={gesture.target} onChange={(event) => update(gesture.id, { target: Number(event.target.value) })}>{NOTE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>}
                                        {gesture.type === "chord" && <label>Аккорд<select value={gesture.target} onChange={(event) => update(gesture.id, { target: event.target.value })}>{CHORD_TYPES.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}</select></label>}
                                        {gesture.type === "instrument" && <label>Инструмент<select value={gesture.target} onChange={(event) => update(gesture.id, { target: event.target.value })}>{INSTRUMENTS.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}</select></label>}
                                    </div>
                                    <div className="gesture-foot"><span>{actionLabel(gesture)}</span></div>
                                </article>
                            ))}
                        </div>
                    </section>
                ))}

                {message && <p className="settings-message" role="status">{message}</p>}
                <p className="settings-note">JSON-файл должен содержать все 64 записи: каждую из 32 комбинаций для обеих рук. Неполный или дублирующийся файл не импортируется.</p>
            </section>
        </main>
    );
}
