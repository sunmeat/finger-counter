import "../styles/SoundButton.css";

export default function SoundButton({ soundOn, onClick }) {
    return <button type="button" className="sound-btn" onClick={onClick}>{soundOn ? "Звук включён" : "Звук выключен"}</button>;
}
