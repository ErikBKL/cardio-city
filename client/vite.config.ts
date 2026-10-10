import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/city": "http://127.0.0.1:3001",
      "/districts": "http://127.0.0.1:3001",
      "/sessions": "http://127.0.0.1:3001",
    },
  },
});
