import { INSTRUMENTS } from "../../domain/piano.js";
import InstrumentSelect from "../controls/InstrumentSelect.jsx";
import SoundButton from "../controls/SoundButton.jsx";
import "../styles/AppHeader.css";

export default function AppHeader(props) {
    const {
        title = "Музыка на пальцах",
        lede,
        instrument,
        onPickInstrument,
        soundOn,
        onEnableSound,
        onOpenSettings,
        onOpenTrainer,
        onOpenPiano,
        activeSection = "piano",
    } = props;

    return (
        <header className="head">
            <div className="head-brand">
                <h1 className="title">{title}</h1>
                <p className="lede">{lede}</p>
            </div>
            <div className="head-controls">
                <nav className="section-nav" aria-label="Основные разделы">
                    <button type="button" className={activeSection === "piano" ? "section-nav-link is-active" : "section-nav-link"} aria-current={activeSection === "piano" ? "page" : undefined} onClick={onOpenPiano}>🏠 Главная</button>
                    <button type="button" className={activeSection === "learn" ? "section-nav-link is-active" : "section-nav-link"} aria-current={activeSection === "learn" ? "page" : undefined} onClick={onOpenTrainer}>📚 Обучение</button>
                    <button type="button" className={activeSection === "settings" ? "section-nav-link is-active" : "section-nav-link"} aria-current={activeSection === "settings" ? "page" : undefined} onClick={onOpenSettings}>⚙ Настройки</button>
                </nav>
                <div className="toolbar">
                    <InstrumentSelect options={INSTRUMENTS} value={instrument} onChange={onPickInstrument} />
                    <SoundButton soundOn={soundOn} onClick={onEnableSound} />
                </div>
            </div>
        </header>
    );
}
