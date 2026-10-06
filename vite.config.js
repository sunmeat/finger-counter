import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// localhost считается безопасным контекстом, поэтому getUserMedia работает и по http
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
});
