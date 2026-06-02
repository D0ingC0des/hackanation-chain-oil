import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { loadEnv } from "vite";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [tsconfigPaths()],
    resolve: {
      alias: { "@": resolve(__dirname, "./src") },
    },
    test: {
      globals: true,
      environment: "node",
      include: ["src/__tests__/**/*.test.ts"],
      // Variáveis de ambiente: .env local > GitHub Secrets > placeholder (unit tests com mock)
      env: {
        VITE_SUPABASE_URL:
          env.VITE_SUPABASE_URL ??
          process.env.VITE_SUPABASE_URL ??
          "https://test-placeholder.supabase.co",
        VITE_SUPABASE_ANON_KEY:
          env.VITE_SUPABASE_ANON_KEY ??
          process.env.VITE_SUPABASE_ANON_KEY ??
          "test-placeholder-anon-key",
      },
    },
  };
});
