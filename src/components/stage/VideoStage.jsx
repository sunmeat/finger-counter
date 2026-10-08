import "../styles/VideoStage.css";

export default function VideoStage({ videoRef, canvasRef, result, status }) {
    return (
        <div className="stage">
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} />
            <p className="chip stage-count">Пальцев <strong>{result ? result.count : "–"}</strong></p>
            {!result && <p className="chip stage-note">{status}</p>}
        </div>
    );
}
