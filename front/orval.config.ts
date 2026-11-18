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
      override: {
        mutator: { path: "src/lib/api/orvalMutator.ts", name: "orvalMutator" },
      },
    },
  },
});
