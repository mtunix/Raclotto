import { defineConfig } from "orval";

export default defineConfig({
  raclotto: {
    input: { target: "../back/openapi.json" },
    output: {
      target: "src/api/generated/endpoints",
      schemas: "src/api/generated/model",
      client: "swr",
      httpClient: "axios",
      mode: "tags-split",
      clean: true,
      // orval bundles the mutator with esbuild at the tsconfig target, and tsconfig.json's es5
      // can't express the classes the transport imports; the other options mirror tsconfig.json.
      tsconfig: { compilerOptions: { target: "es2020", esModuleInterop: true } },
      override: {
        mutator: { path: "src/lib/api/orvalMutator.ts", name: "orvalMutator" },
      },
    },
  },
});
