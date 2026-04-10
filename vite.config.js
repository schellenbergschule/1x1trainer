import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "/1x1trainer/", 
  plugins: [react()],
});
