import { readFileSync } from "node:fs";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { searchForWorkspaceRoot } from "vite";
import { defineConfig } from "vitest/config";

// HTTPS so phones on the LAN get a secure context (camera); scripts/generate-cert.sh makes a trusted pair.
const { SSL_CRT_FILE, SSL_KEY_FILE } = process.env;
const certificate =
  SSL_CRT_FILE && SSL_KEY_FILE ? { cert: readFileSync(SSL_CRT_FILE), key: readFileSync(SSL_KEY_FILE) } : undefined;

export default defineConfig({
  plugins: [react(), ...(certificate ? [] : [basicSsl()])],
  server: {
    host: true,
    port: 3001,
    https: certificate,
    proxy: { "/api": "http://127.0.0.1:8081" },
    // The import tests read the backend's export fixtures.
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), "../back/test/fixtures"] },
  },
  build: {
    outDir: "build",
    rolldownOptions: {
      output: {
        // The libraries that change least get a chunk of their own, so a release keeps them cached.
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler|react-router|i18next|react-i18next)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/setupTests.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
