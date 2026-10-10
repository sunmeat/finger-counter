import "../styles/VideoStage.css";

export default function VideoStage({ videoRef, canvasRef, result, status, onRetry, cameraFacing = "user", onToggleCamera }) {
    const canRetry = status?.includes("Нажмите «Повторить»");

    return (
        <div className={`stage${cameraFacing === "environment" ? " stage-back-camera" : ""}`}>
            <button className="chip stage-camera-toggle" type="button" onClick={onToggleCamera} aria-label={cameraFacing === "user" ? "Включить заднюю камеру" : "Включить фронтальную камеру"}>
                {cameraFacing === "user" ? "↻ Задняя камера" : "↻ Фронтальная"}
            </button>
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} />
            <p className="chip stage-count">Пальцев <strong>{result ? result.count : "–"}</strong></p>
            {!result && <p className="chip stage-note">{status}</p>}
            {!result && canRetry && (
                <button className="chip stage-retry" type="button" onClick={onRetry}>
                    Повторить
                </button>
            )}
        </div>
    );
}
