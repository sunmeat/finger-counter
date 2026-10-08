import { existsSync } from "node:fs";
import { mkdir, copyFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wasmSource = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmTarget = join(root, "public", "mediapipe", "wasm");
const modelTarget = join(root, "public", "mediapipe", "hand_landmarker.task");

const wasmFiles = [
    "vision_wasm_internal.js",
    "vision_wasm_internal.wasm",
    "vision_wasm_nosimd_internal.js",
    "vision_wasm_nosimd_internal.wasm",
];

await mkdir(wasmTarget, { recursive: true });

for (const file of wasmFiles) {
    const source = join(wasmSource, file);
    const target = join(wasmTarget, file);

    if (!existsSync(source)) {
        throw new Error(`MediaPipe asset not found: ${source}`);
    }

    await copyFile(source, target);
}

if (!existsSync(modelTarget)) {
    await download(
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        modelTarget
    );
}

console.log("MediaPipe assets are ready in public/mediapipe.");

function download(url, target) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                response.resume();
                return download(new URL(response.headers.location, url).href, target)
                    .then(resolve)
                    .catch(reject);
            }

            if (response.statusCode !== 200) {
                response.resume();
                reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
                return;
            }

            const chunks = [];
            response.on("data", (chunk) => chunks.push(chunk));
            response.on("end", async () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    await mkdir(dirname(target), { recursive: true });
                    await writeFile(target, buffer);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });

        request.on("error", reject);
        request.setTimeout(120000, () => {
            request.destroy(new Error(`Timed out downloading ${url}`));
        });
    });
}
