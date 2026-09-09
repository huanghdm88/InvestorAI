import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  optimizeDeps: {
    // Keep the dependency graph focused on packages used during first paint.
    // Ant Design icons are imported from the package entrypoint and are
    // discovered by Vite automatically; the optional icon packages are no
    // longer part of the runtime.
    include: ["@ant-design/icons"],
  },
});
