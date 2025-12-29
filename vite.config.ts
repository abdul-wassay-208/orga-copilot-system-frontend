import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import { componentTagger } from "lovable-tagger";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve paths - ensure we're using the directory where vite.config.ts is located
const root = path.resolve(__dirname);
const srcPath = path.resolve(root, "src");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  root: root,
  server: {
    host: "::",
    port: 5173,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: [
      {
        find: /^@\/(.*)/,
        replacement: path.resolve(srcPath, "$1"),
      },
    ],
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
  },
  optimizeDeps: {
    include: ["clsx", "tailwind-merge"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
}));
