import { useEffect, useState } from "react";

const COMPUTER_KEYS = {
    KeyA: 69,
    KeyW: 70,
    KeyS: 71,
    KeyD: 72,
    KeyR: 73,
    KeyF: 74,
    KeyT: 75,
    KeyG: 76,
    KeyH: 77,
    KeyU: 78,
    KeyJ: 79,
    KeyI: 80,
    KeyK: 81,
    KeyO: 82,
    KeyL: 83,
    Semicolon: 84,
    BracketLeft: 85,
    Quote: 86,
    BracketRight: 87,
};

export function useKeyboardPiano({ soundOn, onPlayNote, onReleaseNote }) {
    const [keyboardMidi, setKeyboardMidi] = useState([]);

    useEffect(() => {
        const pressed = new Set();

        const onKeyDown = async (event) => {
            const target = event.target;
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLSelectElement ||
                target?.isContentEditable
            ) return;

            const midi = COMPUTER_KEYS[event.code];
            if (midi == null || pressed.has(event.code)) return;

            event.preventDefault();
            pressed.add(event.code);
            setKeyboardMidi((current) => current.includes(midi) ? current : [...current, midi]);

            if (soundOn) await onPlayNote(midi);
        };

        const onKeyUp = (event) => {
            const midi = COMPUTER_KEYS[event.code];
            if (midi == null) return;

            pressed.delete(event.code);
            setKeyboardMidi((current) => current.filter((note) => note !== midi));
            onReleaseNote(midi);
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            pressed.clear();
            setKeyboardMidi([]);
        };
    }, [soundOn, onPlayNote, onReleaseNote]);

    return keyboardMidi;
}
