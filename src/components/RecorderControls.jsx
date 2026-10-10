import { useEffect, useRef, useState } from "react";
import { createRecordingAudioMixer } from "../infrastructure/audio/Player.js";

function supportedMimeType() {
    return [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function stopTracks(stream) {
    stream?.getTracks().forEach((track) => track.stop());
}

export default function RecorderControls({ videoRef }) {
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const cameraStreamRef = useRef(null);
    const microphoneStreamRef = useRef(null);
    const audioMixerRef = useRef(null);
    const [recording, setRecording] = useState(false);
    const [busy, setBusy] = useState(false);
    const [videoUrl, setVideoUrl] = useState("");
    const [videoBlob, setVideoBlob] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => () => {
        if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
        stopTracks(cameraStreamRef.current);
        stopTracks(microphoneStreamRef.current);
        audioMixerRef.current?.cleanup();
        if (videoUrl) URL.revokeObjectURL(videoUrl);
    }, [videoUrl]);

    const releaseCapture = () => {
        audioMixerRef.current?.cleanup();
        audioMixerRef.current = null;
        stopTracks(cameraStreamRef.current);
        stopTracks(microphoneStreamRef.current);
        cameraStreamRef.current = null;
        microphoneStreamRef.current = null;
    };

    const startRecording = async () => {
        setError("");
        setBusy(true);
        try {
            if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
                throw new Error("Этот браузер не поддерживает запись видео.");
            }

            // Используем уже открытую камеру приложения. getDisplayMedia здесь не нужен,
            // поэтому браузер не показывает окно выбора экрана или вкладки.
            const cameraVideo = videoRef?.current;
            const sourceStream = cameraVideo?.srcObject;
            const sourceTrack = sourceStream?.getVideoTracks?.()[0];
            if (!sourceTrack || sourceTrack.readyState !== "live") {
                throw new Error("Камера ещё не готова. Подождите, пока появится изображение, и попробуйте снова.");
            }

            const cameraTrack = sourceTrack.clone();
            const cameraStream = new MediaStream([cameraTrack]);
            cameraStreamRef.current = cameraStream;

            let microphoneStream;
            try {
                microphoneStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                    video: false,
                });
                microphoneStreamRef.current = microphoneStream;
            } catch {
                throw new Error("Не удалось получить доступ к микрофону. Разрешите микрофон для сайта и попробуйте ещё раз.");
            }

            const microphoneTracks = microphoneStream.getAudioTracks();
            if (microphoneTracks.length === 0) {
                throw new Error("Микрофон не передал аудиосигнал. Проверьте выбранный микрофон в настройках браузера.");
            }

            // Смешиваем голос и звук Tone.js в одну аудиодорожку.
            // Звук приложения при этом продолжает играть через колонки.
            const audioMixer = createRecordingAudioMixer(microphoneStream);
            audioMixerRef.current = audioMixer;
            const mixedAudioTrack = audioMixer.stream.getAudioTracks()[0];
            if (!mixedAudioTrack) {
                throw new Error("Не удалось объединить звук микрофона и пианино. Попробуйте ещё раз.");
            }
            const output = new MediaStream([cameraTrack, mixedAudioTrack]);
            chunksRef.current = [];
            const mimeType = supportedMimeType();
            const recorder = new MediaRecorder(output, mimeType ? { mimeType } : undefined);
            recorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunksRef.current.push(event.data);
            };
            recorder.onerror = () => {
                setError("Во время записи произошла ошибка. Попробуйте ещё раз.");
            };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
                if (blob.size > 0) {
                    setVideoBlob(blob);
                    setVideoUrl((previous) => {
                        if (previous) URL.revokeObjectURL(previous);
                        return URL.createObjectURL(blob);
                    });
                } else {
                    setError("Видео не удалось сохранить. Попробуйте записать ещё раз.");
                }
                setRecording(false);
                releaseCapture();
            };

            cameraTrack.addEventListener("ended", () => {
                if (recorder.state !== "inactive") recorder.stop();
            }, { once: true });
            recorder.start(1000);
            setRecording(true);
        } catch (captureError) {
            releaseCapture();
            if (captureError?.name !== "NotAllowedError") {
                setError(captureError?.message || "Не удалось начать запись.");
            } else {
                setError("Разрешите доступ к микрофону в настройках браузера и нажмите запись ещё раз.");
            }
        } finally {
            setBusy(false);
        }
    };

    const stopRecording = () => {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
            recorderRef.current.stop();
        }
    };

    const downloadVideo = () => {
        if (!videoBlob || !videoUrl) return;
        const link = document.createElement("a");
        link.href = videoUrl;
        link.download = `muzyka-na-paltsakh-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const shareVideo = async () => {
        if (!videoBlob) return;
        const file = new File([videoBlob], "muzyka-na-paltsakh.webm", {
            type: videoBlob.type || "video/webm",
        });
        try {
            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({ title: "Музыка на пальцах", text: "Моя музыка на пальцах 🎹", files: [file] });
                return;
            }
            downloadVideo();
            setError("Этот браузер не поддерживает отправку видеофайла напрямую. Видео скачано: прикрепите его к сообщению или публикации.");
        } catch (shareError) {
            if (shareError?.name !== "AbortError") {
                setError("Не удалось открыть меню отправки. Скачайте видео и прикрепите его вручную.");
            }
        }
    };

    return (
        <section className="recorder" aria-label="Запись исполнения">
            <div className="recorder-copy">
                <span className="recorder-eyebrow">ТВОЁ ИСПОЛНЕНИЕ</span>
                <h2>Спой и сыграй пальцами</h2>
                <p>Записывается камера, твой голос и звук пианино. Интерфейс, подсказки и подсветки в ролик не попадают. Видео остаётся на твоём устройстве.</p>
            </div>
            <div className="recorder-actions">
                {recording ? (
                    <button className="recorder-button recorder-stop" type="button" onClick={stopRecording}>
                        <span className="recorder-dot" /> Остановить запись
                    </button>
                ) : (
                    <button className="recorder-button" type="button" onClick={startRecording} disabled={busy}>
                        {busy ? "Подготовка…" : "● Записать видео"}
                    </button>
                )}
                {videoBlob && !recording && (
                    <>
                        <button className="recorder-button recorder-secondary" type="button" onClick={downloadVideo}>
                            ↓ Скачать видео
                        </button>
                        <button className="recorder-button recorder-secondary" type="button" onClick={shareVideo}>
                            ↗ Поделиться
                        </button>
                    </>
                )}
            </div>
            {recording && <p className="recorder-hint">Записываются камера, микрофон и звук пианино. Интерфейс приложения в ролик не попадает.</p>}
            {videoBlob && !recording && <video className="recorder-preview" src={videoUrl} controls playsInline />}
            {error && <p className="recorder-error" role="status">{error}</p>}
        </section>
    );
}
