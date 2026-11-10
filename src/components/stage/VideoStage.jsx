import "../styles/VideoStage.css";

export default function VideoStage({ videoRef, canvasRef, result, status, onRetry, cameraFacing = "user", onToggleCamera }) {
    const canRetry = status?.includes("Натисніть «Повторити»");

    return (
        <div className={`stage${cameraFacing === "environment" ? " stage-back-camera" : ""}`}>
            <button className="chip stage-camera-toggle" type="button" onClick={onToggleCamera} aria-label={cameraFacing === "user" ? "Увімкнути задню камеру" : "Увімкнути фронтальну камеру"}>
                {cameraFacing === "user" ? "↻ Задня камера" : "↻ Фронтальна"}
            </button>
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} />
            <p className="chip stage-count">Пальців <strong>{result ? result.count : "–"}</strong></p>
            {!result && <p className="chip stage-note">{status}</p>}
            {!result && canRetry && (
                <button className="chip stage-retry" type="button" onClick={onRetry}>
                    Повторити
                </button>
            )}
        </div>
    );
}
