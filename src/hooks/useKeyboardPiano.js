import { useEffect, useState } from "react";

const COMPUTER_KEYS = {
    a: 69, w: 70, s: 71, d: 72, r: 73, f: 74,
    t: 75, g: 76, h: 77, u: 78, j: 79, i: 80,
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

            const key = event.key.toLowerCase();
            const midi = COMPUTER_KEYS[key];
            if (midi == null || pressed.has(key)) return;

            event.preventDefault();
            pressed.add(key);
            setKeyboardMidi((current) => current.includes(midi) ? current : [...current, midi]);

            if (soundOn) await onPlayNote(midi);
        };

        const onKeyUp = (event) => {
            const key = event.key.toLowerCase();
            const midi = COMPUTER_KEYS[key];
            if (midi == null) return;

            pressed.delete(key);
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
