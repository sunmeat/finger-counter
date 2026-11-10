import "../styles/SoundButton.css";

export default function SoundButton({ soundOn, onClick }) {
    if (soundOn) {
        return null;
    }

    return (
        <button type="button" className="sound-btn" onClick={onClick}>
            Увімкнути звук!
        </button>
    );
}
