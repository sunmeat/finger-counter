import { useRef, useState } from "react";
import { CHORD_TYPES, GESTURE_ACTIONS, GESTURE_PROFILES, normalizeGestures, validateGestures } from "../domain/customGestures.js";
import { HANDEDNESS } from "../domain/constants.js";
import { INSTRUMENTS } from "../domain/piano.js";
import Segmented from "./controls/Segmented.jsx";
import "./styles/SettingsScreen.css";

const FINGERS = ["Большой", "Указательный", "Средний", "Безымянный", "Мизинец"];
const NOTE_OPTIONS = Array.from({ length: 37 }, (_, index) => ({ value: index + 48, label: midiName(index + 48) }));
function midiName(midi) {
    const names = ["До", "До♯", "Ре", "Ре♯", "Ми", "Фа", "Фа♯", "Соль", "Соль♯", "Ля", "Ля♯", "Си"];
    return names[midi % 12] + (Math.floor(midi / 12) - 1);
}
function emptyGesture() {
    return { id: crypto.randomUUID(), side: "right", mask: "10000", type: "note", target: 60 };
}
function labelFor(gesture) {
    const fingers = FINGERS.filter((_, index) => gesture.mask[index] === "1");
    return fingers.length ? fingers.join(" + ") : "Все пальцы согнуты";
}

export default function SettingsScreen({ dominant, onPickDominant, gestures, onSaveGestures, onBack }) {
    const [draft, setDraft] = useState(gestures);
    const [message, setMessage] = useState("");
    const fileRef = useRef(null);
    const conflicts = validateGestures(draft);

    const update = (id, patch) => setDraft((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
    const add = () => setDraft((items) => [...items, emptyGesture()]);
    const remove = (id) => setDraft((items) => items.filter((item) => item.id !== id));
    const exportJson = () => {
        const blob = new Blob([JSON.stringify({ version: 1, gestures: draft }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "aerodion-gesture-layout.json";
        link.click();
        URL.revokeObjectURL(url);
        setMessage("Раскладка экспортирована в JSON.");
    };
    const importJson = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const parsed = JSON.parse(await file.text());
            const imported = normalizeGestures(parsed.gestures ?? parsed);
            setDraft(imported);
            setMessage("Файл загружен. Нажмите «Сохранить раскладку», чтобы применить изменения.");
        } catch (error) {
            setMessage(error.message || "Не удалось прочитать JSON.");
        } finally {
            event.target.value = "";
        }
    };
    const loadProfile = (profile) => {
        setDraft((GESTURE_PROFILES[profile] ?? []).map((item) => ({ ...item, id: crypto.randomUUID() })));
        setMessage(profile === "classic" ? "Загружена стандартная раскладка." : "Загружен профиль аккордов.");
    };
    const save = () => {
        if (conflicts.size) {
            setMessage("Есть конфликтующие жесты. Каждая рука и комбинация пальцев должны быть уникальны.");
            return;
        }
        onSaveGestures(draft);
        setMessage("Раскладка сохранена на этом устройстве.");
    };

    return (
        <main className="settings-screen">
            <header className="settings-header">
                <div>
                    <p className="settings-eyebrow">AERODION / ПЕРСОНАЛИЗАЦИЯ</p>
                    <h1>Настройки</h1>
                    <p>Настройте роли рук и собственные жесты. Всё хранится в браузере, без аккаунта.</p>
                </div>
                <button className="settings-back" type="button" onClick={onBack}>← Вернуться к пианино</button>
            </header>

            <section className="settings-card">
                <div className="settings-section-title"><span>01</span><div><h2>Ведущая рука</h2><p>Меняет распределение ролей: одна рука задаёт ноту, другая выбирает аккорд.</p></div></div>
                <Segmented label="Ведущая рука" options={HANDEDNESS} value={dominant} onChange={onPickDominant} />
            </section>

            <section className="settings-card">
                <div className="settings-section-title"><span>02</span><div><h2>Редактор жестов</h2><p>Одинаковая комбинация на разных руках считается разными жестами.</p></div></div>
                <div className="profile-row">
                    <label>Готовый профиль<select defaultValue="" onChange={(event) => event.target.value && loadProfile(event.target.value)}><option value="">Выберите профиль…</option><option value="classic">Стандартная раскладка</option><option value="chords">Быстрые аккорды</option></select></label>
                    <button type="button" className="settings-secondary" onClick={add}>＋ Добавить жест</button>
                </div>
                <div className="gesture-list">
                    {draft.map((gesture, index) => (
                        <article className={conflicts.has(gesture.side + ":" + gesture.mask) ? "gesture-row conflict" : "gesture-row"} key={gesture.id}>
                            <div className="gesture-number">{String(index + 1).padStart(2, "0")}</div>
                            <div className="gesture-fields">
                                <label>Рука<select value={gesture.side} onChange={(event) => update(gesture.id, { side: event.target.value })}><option value="left">Левая</option><option value="right">Правая</option></select></label>
                                <label>Пальцы<select value={gesture.mask} onChange={(event) => update(gesture.id, { mask: event.target.value })}>{Array.from({ length: 32 }, (_, value) => ({ mask: value.toString(2).padStart(5, "0") })).map(({ mask }) => <option key={mask} value={mask}>{labelFor({ mask })}</option>)}</select></label>
                                <label>Действие<select value={gesture.type} onChange={(event) => update(gesture.id, { type: event.target.value, target: event.target.value === "note" ? 60 : event.target.value === "chord" ? "major" : event.target.value === "instrument" ? "accordion" : "" })}><option value="note">Сыграть ноту</option><option value="chord">Сыграть аккорд</option>{GESTURE_ACTIONS.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}</select></label>
                                {gesture.type === "note" && <label>Нота<select value={gesture.target} onChange={(event) => update(gesture.id, { target: Number(event.target.value) })}>{NOTE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>}
                                {gesture.type === "chord" && <label>Аккорд<select value={gesture.target} onChange={(event) => update(gesture.id, { target: event.target.value })}>{CHORD_TYPES.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}</select></label>}
                                {gesture.type === "instrument" && <label>Инструмент<select value={gesture.target} onChange={(event) => update(gesture.id, { target: event.target.value })}>{INSTRUMENTS.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}</select></label>}
                            </div>
                            <div className="gesture-foot"><span>{conflicts.has(gesture.side + ":" + gesture.mask) ? "⚠ Конфликт: такая комбинация уже назначена этой руке" : labelFor(gesture)}</span><button type="button" aria-label="Удалить жест" onClick={() => remove(gesture.id)}>Удалить</button></div>
                        </article>
                    ))}
                    {!draft.length && <p className="settings-empty">Пока нет пользовательских жестов. Стандартное управление продолжит работать.</p>}
                </div>
                <div className="settings-actions">
                    <button type="button" className="settings-primary" onClick={save}>Сохранить раскладку</button>
                    <button type="button" className="settings-secondary" onClick={exportJson}>Экспорт JSON</button>
                    <button type="button" className="settings-secondary" onClick={() => fileRef.current?.click()}>Импорт JSON</button>
                    <input ref={fileRef} className="settings-file" type="file" accept="application/json,.json" onChange={importJson} />
                </div>
                {message && <p className="settings-message" role="status">{message}</p>}
                <p className="settings-note">Пользовательские жесты имеют приоритет над стандартной комбинацией для той же руки. Жесты смены октавы применяются к звучанию, а не к положению рук в кадре.</p>
            </section>
        </main>
    );
}
