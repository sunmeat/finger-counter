import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import {
    CHORD_GESTURES,
    NOTE_COMBINATIONS,
    chordFromFingers,
    getNoteByFingers,
} from "../domain/piano.js";
import { rolesFor } from "../domain/handRoles.js";
import AppHeader from "./layout/AppHeader.jsx";
import CurrentSound from "./stage/CurrentSound.jsx";
import "./styles/TrainerScreen.css";

const PROGRESS_KEY = "aerodion.trainer.progress.v1";
const WARMUP_ATTEMPTS = 3;
const FINGER_NAMES = ["Большой", "Указательный", "Средний", "Безымянный", "Мизинец"];
const NATURAL_NOTES = [60, 62, 64, 65, 67, 69, 71];
const EASY_CHORDS = CHORD_GESTURES.filter((chord) => ["мажор", "минор"].includes(chord.name));
const MEDIUM_CHORDS = CHORD_GESTURES.filter((chord) =>
    ["мажор", "минор", "Major 7", "Minor 7", "7", "sus4", "sus2"].includes(chord.name)
);

function readProgress() {
    try {
        const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
        return {
            attempts: Number(saved.attempts) || 0,
            correct: Number(saved.correct) || 0,
            warmup: Math.min(WARMUP_ATTEMPTS, Number(saved.warmup) || 0),
            completed: Number(saved.completed) || 0,
            streak: Number(saved.streak) || 0,
            bestStreak: Number(saved.bestStreak) || 0,
        };
    } catch {
        return { attempts: 0, correct: 0, warmup: 0, completed: 0, streak: 0, bestStreak: 0 };
    }
}

function recordAttempt(current, correct) {
    const warmingUp = current.warmup < WARMUP_ATTEMPTS;
    const streak = correct ? current.streak + 1 : 0;
    return {
        ...current,
        warmup: Math.min(WARMUP_ATTEMPTS, current.warmup + 1),
        attempts: current.attempts + Number(!warmingUp),
        correct: current.correct + Number(!warmingUp && correct),
        streak,
        bestStreak: correct ? Math.max(current.bestStreak, streak) : current.bestStreak,
    };
}

function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function notePool(difficulty) {
    return difficulty === "easy"
        ? NOTE_COMBINATIONS.filter((note) => NATURAL_NOTES.includes(note.midi))
        : NOTE_COMBINATIONS;
}

function chordPool(difficulty) {
    if (difficulty === "easy") return EASY_CHORDS;
    if (difficulty === "medium") return MEDIUM_CHORDS;
    return CHORD_GESTURES.filter((chord) => chord.mask !== 0);
}

function createChordTarget(difficulty) {
    const note = pick(notePool(difficulty));
    const chord = pick(chordPool(difficulty));
    return {
        root: note.midi,
        noteName: note.name,
        chordMask: chord.mask,
        chordName: chord.name,
        midi: chord.intervals.map((interval) => note.midi + interval).sort((a, b) => a - b),
        label: note.name + " " + chord.name,
    };
}

function createTask(mode, difficulty) {
    if (mode === "notes") {
        const note = pick(notePool(difficulty));
        return { kind: "note", difficulty, targetMidi: note.midi, label: note.name, prompt: "Покажи ноту " + note.name };
    }
    if (mode === "sequence") {
        const sequence = Array.from({ length: 4 }, () => createChordTarget(difficulty));
        return { kind: "sequence", difficulty, sequence, prompt: "Повтори последовательность из четырёх аккордов" };
    }
    const target = createChordTarget(difficulty);
    return { kind: "chord", difficulty, target, prompt: "Сыграй " + target.label };
}

export default function TrainerScreen(props) {
    const { result, dominant, onCloseTrainer } = props;
    const trainerVideoRef = useRef(null);
    const [mode, setMode] = useState("chords");
    const [difficulty, setDifficulty] = useState("easy");
    const [task, setTask] = useState(() => createTask("chords", "easy"));
    const [sequenceIndex, setSequenceIndex] = useState(0);
    const [solved, setSolved] = useState(false);
    const [feedback, setFeedback] = useState({ type: "hint", text: "Покажи нужную комбинацию пальцев в камеру." });
    const [progress, setProgress] = useState(readProgress);
    const lastAttemptRef = useRef("");
    const celebrationPlayedRef = useRef(false);

    useEffect(() => {
        const preview = trainerVideoRef.current;
        const source = props.videoRef?.current;
        if (!preview || !source?.srcObject) return;
        preview.srcObject = source.srcObject;
        void preview.play().catch(() => {});
        return () => {
            preview.srcObject = null;
        };
    }, [props.videoRef, props.cameraFacing, props.status]);

    useEffect(() => {
        try {
            localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
        } catch (error) {
            console.warn("Не удалось сохранить прогресс тренажёра:", error);
        }
    }, [progress]);

    useEffect(() => {
        setTask(createTask(mode, difficulty));
        setSequenceIndex(0);
        setSolved(false);
        setFeedback({ type: "hint", text: "Новое задание готово. Покажи ответ обеими руками." });
    }, [mode, difficulty]);

    useEffect(() => {
        if (solved) return;
        const expectedKind = mode === "notes" ? "note" : mode === "sequence" ? "sequence" : "chord";
        if (task.kind !== expectedKind || task.difficulty !== difficulty) return;

        const { noteSide, chordSide } = rolesFor(dominant);
        const noteHand = result?.hands?.find((hand) => hand.side === noteSide);
        const chordHand = result?.hands?.find((hand) => hand.side === chordSide);
        const note = getNoteByFingers(noteHand?.fingers);
        const chord = chordFromFingers(chordHand?.fingers);

        if (mode === "notes") {
            if (!note) {
                lastAttemptRef.current = "";
                return;
            }
            const signature = "note:" + note.midi;
            if (signature === lastAttemptRef.current) return;
            lastAttemptRef.current = signature;

            const correct = note.midi === task.targetMidi;
            setProgress((current) => recordAttempt(current, correct));
            setFeedback(correct
                ? { type: "success", text: "Верно! Это нота " + note.name + "." }
                : { type: "error", text: "Распознана нота " + note.name + ". Попробуй ещё раз." });
            if (correct) setSolved(true);
            return;
        }

        if (!note || !chord) {
            lastAttemptRef.current = "";
            return;
        }

        const signature = "chord:" + note.midi + ":" + chord.mask;
        if (signature === lastAttemptRef.current) return;
        lastAttemptRef.current = signature;

        const target = task.kind === "sequence" ? task.sequence[sequenceIndex] : task.target;
        const correct = note.midi === target.root && chord.mask === target.chordMask;
        setProgress((current) => recordAttempt(current, correct));

        if (!correct) {
            setFeedback({ type: "error", text: "Сейчас звучит " + note.name + " " + chord.name + ". Сверься с заданием и попробуй ещё раз." });
            return;
        }

        if (task.kind === "sequence") {
            const nextIndex = sequenceIndex + 1;
            if (nextIndex >= task.sequence.length) {
                setSolved(true);
                setProgress((current) => ({ ...current, completed: current.completed + 1 }));
                setFeedback({ type: "success", text: "Цепочка собрана целиком! Все четыре аккорда распознаны." });
            } else {
                setSequenceIndex(nextIndex);
                setFeedback({ type: "success", text: "Верно! Аккорд " + (sequenceIndex + 1) + " из 4. Следующий уже ждёт." });
            }
        } else {
            setSolved(true);
            setFeedback({ type: "success", text: "Точно! Распознан аккорд " + target.label + "." });
        }
    }, [result, dominant, mode, task, sequenceIndex, solved]);


    useEffect(() => {
        if (!solved || celebrationPlayedRef.current) return;
        celebrationPlayedRef.current = true;
        if (!props.soundOn) return undefined;

        let synth;
        let disposed = false;
        void Tone.start().then(() => {
            if (disposed) return;
            synth = new Tone.Synth({
                oscillator: { type: "triangle" },
                envelope: { attack: 0.008, decay: 0.18, sustain: 0.16, release: 0.45 },
            }).toDestination();
            synth.volume.value = -5;
            const now = Tone.now();
            ["C5", "E5", "G5", "C6"].forEach((note, index) => {
                synth.triggerAttackRelease(note, "8n", now + index * 0.12, 0.72);
            });
        }).catch(() => {});
        return () => {
            disposed = true;
            if (synth) window.setTimeout(() => synth.dispose(), 1800);
        };
    }, [solved, props.soundOn]);

    useEffect(() => {
        if (!solved) celebrationPlayedRef.current = false;
    }, [solved]);

    const nextTask = () => {
        setTask(createTask(mode, difficulty));
        setSequenceIndex(0);
        setSolved(false);
        setFeedback({ type: "hint", text: "Новое задание. Покажи ответ в камеру." });
    };

    const resetProgress = () => {
        const empty = { attempts: 0, correct: 0, warmup: 0, completed: 0, streak: 0, bestStreak: 0 };
        setProgress(empty);
        setFeedback({ type: "hint", text: "Прогресс сброшен. Начинаем с чистого листа." });
    };

    const { noteSide } = rolesFor(dominant);
    const accuracy = progress.attempts ? Math.round((progress.correct / progress.attempts) * 100) : null;
    const currentTarget = task.kind === "sequence" ? task.sequence[sequenceIndex] : task.target;
    const targetNote = task.kind === "note"
        ? NOTE_COMBINATIONS.find((note) => note.midi === task.targetMidi)
        : NOTE_COMBINATIONS.find((note) => note.midi === currentTarget?.root);
    const targetChord = task.kind === "note"
        ? null
        : CHORD_GESTURES.find((chord) => chord.mask === currentTarget?.chordMask);
    const { noteSide: targetNoteSide, chordSide: targetChordSide } = rolesFor(dominant);
    const lede = "Тренируй слух и память, а руки пусть отвечают вместо кнопок.";

    return (
        <main className="trainer-page">
            <AppHeader {...props} title="Обучение" lede={lede} activeSection="learn" onCloseTrainer={onCloseTrainer} />
            <section className="trainer-layout">
                <div className="trainer-main">
                    <div className="trainer-intro">
                        <span className="trainer-eyebrow">МУЗЫКАЛЬНАЯ ПРАКТИКА</span>
                        <h2>Поймай правильный звук</h2>
                        <p>Смотри на задание, собери жест пальцами и держи его перед камерой. Распознавание происходит прямо в браузере.</p>
                    </div>

                    <div className="trainer-options">
                        <div className="trainer-option-group">
                            <span className="trainer-label">Что тренируем</span>
                            <div className="trainer-segments">
                                {[
                                    ["notes", "Ноты"],
                                    ["chords", "Аккорды"],
                                    ["sequence", "Цепочки"],
                                ].map(([value, label]) => (
                                    <button key={value} type="button" className={mode === value ? "is-active" : ""} onClick={() => setMode(value)}>{label}</button>
                                ))}
                            </div>
                        </div>
                        <div className="trainer-option-group">
                            <span className="trainer-label">Сложность</span>
                            <div className="trainer-segments">
                                {[
                                    ["easy", "Начинающий"],
                                    ["medium", "Музыкант"],
                                    ["hard", "Виртуоз"],
                                ].map(([value, label]) => (
                                    <button key={value} type="button" className={difficulty === value ? "is-active" : ""} onClick={() => setDifficulty(value)}>{label}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <section className="trainer-task" aria-live="polite">
                        <div className="trainer-task-top">
                            <span className="trainer-eyebrow">{task.kind === "note" ? "ЗАДАНИЕ · НОТЫ" : task.kind === "sequence" ? "ЗАДАНИЕ · ПАМЯТЬ" : "ЗАДАНИЕ · АККОРДЫ"}</span>
                            {task.kind === "sequence" && <span className="trainer-step">{Math.min(sequenceIndex + 1, 4)} / 4</span>}
                        </div>
                        <h3>{task.prompt}</h3>
                        {task.kind === "sequence" ? (
                            <div className="trainer-sequence">
                                {task.sequence.map((item, index) => (
                                    <div key={index} className={"trainer-sequence-item " + (index < sequenceIndex ? "is-done" : index === sequenceIndex ? "is-current" : "")}>
                                        <span>{index + 1}</span>
                                        <strong>{item.label}</strong>
                                        {index < sequenceIndex && <small>Распознано</small>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="trainer-target">
                                <span className="trainer-target-note">{task.kind === "note" ? task.label : currentTarget.noteName}</span>
                                {task.kind !== "note" && <span className="trainer-target-chord">{currentTarget.chordName}</span>}
                            </div>
                        )}
                        <p className="trainer-task-hint">
                            {task.kind === "note"
                                ? "Подсказка ниже показывает нужный жест для руки, которая отвечает за ноты."
                                : "Подсказка показывает нужные пальцы отдельно для ноты и аккорда. Подними только отмеченные пальцы."}
                        </p>
                        <div className="trainer-finger-guides" aria-label="Подсказка по пальцам">
                            <div className="trainer-finger-guide trainer-finger-guide-note">
                                <div className="trainer-finger-guide-heading">
                                    <span>{targetNoteSide === "left" ? "Левая рука" : "Правая рука"}</span>
                                    <strong>Нота: {targetNote?.name ?? "не определена"}</strong>
                                </div>
                                <div className="trainer-fingers" aria-label={"Поднять пальцы: " + (targetNote?.fingers?.map((finger) => FINGER_NAMES[finger - 1]).join(", ") || "нет")}>
                                    {FINGER_NAMES.map((name, index) => {
                                        const raised = targetNote?.fingers?.includes(index + 1) ?? false;
                                        return <div key={name} className={"trainer-finger " + (raised ? "is-raised" : "is-bent")}><span>{index + 1}</span><small>{name}</small><strong>{raised ? "Поднять" : "Согнуть"}</strong></div>;
                                    })}
                                </div>
                            </div>
                            <div className={"trainer-finger-guide trainer-finger-guide-chord" + (task.kind === "note" ? " is-optional" : "")}>
                                <div className="trainer-finger-guide-heading">
                                    <span>{targetChordSide === "left" ? "Левая рука" : "Правая рука"}</span>
                                    <strong>{task.kind === "note" ? "Для этой задачи не нужна" : "Аккорд: " + (targetChord?.name ?? "не определён")}</strong>
                                </div>
                                <div className="trainer-fingers" aria-label={task.kind === "note" ? "Вторая рука не нужна" : "Пальцы для аккорда"}>
                                    {FINGER_NAMES.map((name, index) => {
                                        const raised = targetChord?.fingers?.includes(index + 1) ?? false;
                                        return <div key={name} className={"trainer-finger " + (task.kind === "note" ? "is-unused" : raised ? "is-raised" : "is-bent")}><span>{index + 1}</span><small>{name}</small><strong>{task.kind === "note" ? "Не нужна" : raised ? "Поднять" : "Согнуть"}</strong></div>;
                                    })}
                                </div>
                            </div>
                        </div>
                        {progress.warmup < WARMUP_ATTEMPTS && <p className="trainer-warmup" role="status">Разминка: {progress.warmup} из {WARMUP_ATTEMPTS}. Первые три попытки не попадут в процент успеха.</p>}
                        <div className={"trainer-feedback is-" + feedback.type} role="status">{feedback.text}</div>
                        {solved && <button type="button" className="trainer-next" onClick={nextTask}>{task.kind === "sequence" ? "Новая последовательность →" : "Следующее задание →"}</button>}
                    </section>

                    <div className="trainer-stats">
                        <div><strong>{accuracy === null ? "—" : accuracy + "%"}</strong><span>точность · после разминки</span></div>
                        <div><strong>{progress.streak}</strong><span>серия сейчас</span></div>
                        <div><strong>{progress.bestStreak}</strong><span>лучшая серия</span></div>
                        <div><strong>{progress.completed}</strong><span>цепочек пройдено</span></div>
                    </div>
                    <button type="button" className="trainer-reset" onClick={resetProgress}>Сбросить личный прогресс</button>
                </div>

                <aside className="trainer-camera">
                    <div className="trainer-camera-heading">
                        <span className="trainer-eyebrow">КАМЕРА</span>
                        <h3>Твои руки, твой инструмент</h3>
                        <p>{props.status || "Покажи руки в кадре"}</p>
                    </div>
                    <div className={"trainer-stage" + (props.cameraFacing === "environment" ? " trainer-stage-back-camera" : "")}>
                        <video ref={trainerVideoRef} autoPlay muted playsInline />
                        <button type="button" className="trainer-camera-toggle" onClick={props.onToggleCamera}>
                            {props.cameraFacing === "environment" ? "↻ Фронтальная" : "↻ Задняя камера"}
                        </button>
                        {!result && <span className="trainer-stage-status">{props.status || "Ожидаю камеру…"}</span>}
                    </div>
                    <CurrentSound result={result} soundOn={props.soundOn} noteSide={noteSide} />
                    <p className="trainer-privacy">Прогресс сохраняется только в этом браузере. Регистрация не нужна.</p>
                </aside>
            </section>
        </main>
    );
}
