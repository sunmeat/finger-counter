import { INSTRUMENTS } from "../../domain/piano.js";
import { HANDEDNESS } from "../../domain/constants.js";
import InstrumentSelect from "../controls/InstrumentSelect.jsx";
import Segmented from "../controls/Segmented.jsx";
import SoundButton from "../controls/SoundButton.jsx";
import "../styles/AppHeader.css";

export default function AppHeader(props) {
    const { lede, instrument, onPickInstrument, dominant, onPickDominant, soundOn, onEnableSound } = props;
    return (
        <header className="head">
            <div>
                <h1 className="title">Пианино на пальцах</h1>
                <p className="lede">{lede}</p>
            </div>
            <div className="toolbar">
                <InstrumentSelect options={INSTRUMENTS} value={instrument} onChange={onPickInstrument} />
                <Segmented label="Ведущая рука" options={HANDEDNESS} value={dominant} onChange={onPickDominant} />
                <SoundButton soundOn={soundOn} onClick={onEnableSound} />
            </div>
        </header>
    );
}
