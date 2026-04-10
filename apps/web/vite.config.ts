import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@sift\/shared$/,
        replacement: path.resolve(
          __dirname,
          "../../packages/shared/src/index.ts",
        ),
      },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: [path.resolve(__dirname, "src/__tests__/setup.ts")],
    globals: true,
    env: {
      VITE_SUPABASE_URL: "https://test.supabase.co",
      VITE_SUPABASE_ANON_KEY: "test-anon-key-for-vitest",
    },
    alias: {
      // Point @sift/shared to source so fake-indexeddb polyfills before the db singleton is created
      "@sift/shared": path.resolve(
        __dirname,
        "../../packages/shared/src/index.ts",
      ),
    },
  },
});
