import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo (npm run dev), las llamadas a /api se redirigen a la API local en el puerto 3000.
// En Docker es nginx quien hace esa redirección (ver nginx.conf).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
