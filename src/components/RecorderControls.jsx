import { useEffect, useRef, useState } from "react";

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

export default function RecorderControls() {
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const displayStreamRef = useRef(null);
    const microphoneStreamRef = useRef(null);
    const audioContextRef = useRef(null);
    const [recording, setRecording] = useState(false);
    const [busy, setBusy] = useState(false);
    const [videoUrl, setVideoUrl] = useState("");
    const [videoBlob, setVideoBlob] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => () => {
        recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
        stopTracks(displayStreamRef.current);
        stopTracks(microphoneStreamRef.current);
        void audioContextRef.current?.close();
        if (videoUrl) URL.revokeObjectURL(videoUrl);
    }, [videoUrl]);

    const releaseCapture = async () => {
        stopTracks(displayStreamRef.current);
        stopTracks(microphoneStreamRef.current);
        displayStreamRef.current = null;
        microphoneStreamRef.current = null;
        if (audioContextRef.current) {
            await audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
    };

    const startRecording = async () => {
        setError("");
        setBusy(true);
        try {
            if (!navigator.mediaDevices?.getDisplayMedia || !navigator.mediaDevices?.getUserMedia) {
                throw new Error("Для записи нужен современный браузер с поддержкой захвата экрана.");
            }
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: { ideal: 30, max: 30 } },
                audio: true,
            });
            displayStreamRef.current = displayStream;
            let microphoneStream;
            try {
                microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                microphoneStreamRef.current = microphoneStream;
            } catch {
                throw new Error("Не удалось получить доступ к микрофону. Разрешите его и попробуйте ещё раз.");
            }

            const videoTrack = displayStream.getVideoTracks()[0];
            if (!videoTrack) throw new Error("Не удалось получить видео с экрана.");
            const output = new MediaStream([videoTrack]);
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            const destination = audioContext.createMediaStreamDestination();
            const audioTracks = [
                ...displayStream.getAudioTracks(),
                ...microphoneStream.getAudioTracks(),
            ];
            audioTracks.forEach((track) => {
                const source = audioContext.createMediaStreamSource(new MediaStream([track]));
                source.connect(destination);
            });
            destination.stream.getAudioTracks().forEach((track) => output.addTrack(track));

            chunksRef.current = [];
            const mimeType = supportedMimeType();
            const recorder = new MediaRecorder(output, mimeType ? { mimeType } : undefined);
            recorderRef.current = recorder;
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunksRef.current.push(event.data);
            };
            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
                if (blob.size > 0) {
                    setVideoBlob(blob);
                    setVideoUrl((previous) => {
                        if (previous) URL.revokeObjectURL(previous);
                        return URL.createObjectURL(blob);
                    });
                }
                setRecording(false);
                await releaseCapture();
            };
            videoTrack.addEventListener("ended", () => {
                if (recorder.state !== "inactive") recorder.stop();
            }, { once: true });
            recorder.start(1000);
            setRecording(true);
        } catch (captureError) {
            await releaseCapture();
            if (captureError?.name !== "NotAllowedError") {
                setError(captureError?.message || "Не удалось начать запись.");
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
            if (navigator.share) {
                await navigator.share({ title: "Музыка на пальцах", text: "Я записал(а) исполнение в «Музыке на пальцах»!", url: window.location.href });
                return;
            }
            downloadVideo();
            setError("Этот браузер не поддерживает отправку видео напрямую. Файл скачан: прикрепите его к сообщению или публикации.");
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
                <p>Запиши экран с жестами и звуком микрофона. Видео собирается прямо в браузере и не загружается на сервер.</p>
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
            {recording && <p className="recorder-hint">Выберите вкладку с приложением и включите передачу звука вкладки, если хотите записать звучание пианино. Микрофон записывается отдельно.</p>}
            {videoBlob && !recording && <video className="recorder-preview" src={videoUrl} controls playsInline />}
            {error && <p className="recorder-error" role="status">{error}</p>}
        </section>
    );
}
