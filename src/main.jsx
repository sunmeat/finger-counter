import { createRoot } from "react-dom/client";
import App from "./app/App.jsx";

createRoot(document.getElementById("root")).render(<App />);\n\nif ("serviceWorker" in navigator) {\n    window.addEventListener("load", () => {\n        navigator.serviceWorker.register("/sw.js").catch((error) => {\n            console.warn("Не удалось зарегистрировать service worker:", error);\n        });\n    });\n}
