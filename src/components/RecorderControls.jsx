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
                throw new Error("Цей браузер не підтримує запис відео.");
            }

            const cameraVideo = videoRef?.current;
            const sourceStream = cameraVideo?.srcObject;
            const sourceTrack = sourceStream?.getVideoTracks?.()[0];
            if (!sourceTrack || sourceTrack.readyState !== "live") {
                throw new Error("Камера ще не готова. Зачекайте, поки з'явиться зображення, і спробуйте знову.");
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
                throw new Error("Не вдалося отримати доступ до мікрофону. Дозвольте мікрофон для сайту та спробуйте ще раз.");
            }

            const microphoneTracks = microphoneStream.getAudioTracks();
            if (microphoneTracks.length === 0) {
                throw new Error("Мікрофон не передав аудіосигнал. Перевірте вибраний мікрофон у налаштуваннях браузера.");
            }

            const audioMixer = createRecordingAudioMixer(microphoneStream);
            audioMixerRef.current = audioMixer;
            const mixedAudioTrack = audioMixer.stream.getAudioTracks()[0];
            if (!mixedAudioTrack) {
                throw new Error("Не вдалося об'єднати звук мікрофона та піаніно. Спробуйте ще раз.");
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
                setError("Під час запису сталася помилка. Спробуйте ще раз.");
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
                    setError("Відео не вдалося зберегти. Спробуйте ще раз записати.");
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
                setError(captureError?.message || "Не вдалося розпочати запис.");
            } else {
                setError("Дозволіть доступ до мікрофона в установках браузера та натисніть ще раз.");
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
                await navigator.share({ title: "Музика на пальцях", text: "Моя музика на пальцях 🎹", files: [file] });
                return;
            }
            downloadVideo();
            setError("Цей браузер не підтримує відправлення відео безпосередньо. Відео завантажено: прикріпіть його до повідомлення чи публікації.");
        } catch (shareError) {
            if (shareError?.name !== "AbortError") {
                setError("Не вдалося відкрити меню надсилання. Завантажте відео та прикріпіть його вручну.");
            }
        }
    };

    return (
        <section className="recorder" aria-label="Запис виконання">
            <div className="recorder-copy">
                <span className="recorder-eyebrow">ТВОЕ ВИКОНАННЯ</span>
                <h2>Заспівай і зіграй пальцями</h2>
                <p>Записується камера, твій голос та звук піаніно. Інтерфейс, підказки та підсвічування в ролик не потрапляють. Відео залишається на твоєму пристрої.</p>
            </div>
            <div className="recorder-actions">
                {recording ? (
                    <button className="recorder-button recorder-stop" type="button" onClick={stopRecording}>
                        <span className="recorder-dot" /> Зупинити запис
                    </button>
                ) : (
                    <button className="recorder-button" type="button" onClick={startRecording} disabled={busy}>
                        {busy ? "Підготовка..." : "● Записати відео"}
                    </button>
                )}
                {videoBlob && !recording && (
                    <>
                        <button className="recorder-button recorder-secondary" type="button" onClick={downloadVideo}>
                            ↓ Завантажити відео
                        </button>
                        <button className="recorder-button recorder-secondary" type="button" onClick={shareVideo}>
                            ↗ Поділитися
                        </button>
                    </>
                )}
            </div>
            {recording && <p className="recorder-hint">Записуються камера, мікрофон та звук піаніно. Інтерфейс програми до ролика не потрапляє.</p>}
            {videoBlob && !recording && <video className="recorder-preview" src={videoUrl} controls playsInline />}
            {error && <p className="recorder-error" role="status">{error}</p>}
        </section>
    );
}
