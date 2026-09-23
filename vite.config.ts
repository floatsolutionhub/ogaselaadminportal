import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Without this, Vite silently falls back to the next free port (5174, 5175, ...) if 5173 is
    // already taken - which then breaks CORS against Ogasela.API (Cors:AllowedOrigins is pinned
    // to 5173) with no obvious error pointing back at the port shift. Failing loudly here instead
    // means "kill whatever else is on 5173" rather than a confusing CORS error somewhere else.
    strictPort: true,
  },
})
