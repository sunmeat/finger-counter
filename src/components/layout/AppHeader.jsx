import { INSTRUMENTS } from "../../domain/piano.js";
import InstrumentSelect from "../controls/InstrumentSelect.jsx";
import SoundButton from "../controls/SoundButton.jsx";
import "../styles/AppHeader.css";

export default function AppHeader(props) {
    const { lede, instrument, onPickInstrument, soundOn, onEnableSound, onOpenSettings } = props;
    return (
        <header className="head">
            <div>
                <h1 className="title">Музыка на пальцах</h1>
                <p className="lede">{lede}</p>
            </div>
            <div className="toolbar">
                <InstrumentSelect options={INSTRUMENTS} value={instrument} onChange={onPickInstrument} />
                <SoundButton soundOn={soundOn} onClick={onEnableSound} />
                <button type="button" className="settings-open-button" onClick={onOpenSettings}>⚙ Настройки</button>
            </div>
        </header>
    );
}
