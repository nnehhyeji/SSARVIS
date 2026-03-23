import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

function getApiTarget(rawUrl: string | undefined): string {
  const fallback = 'http://localhost:8080';
  const candidate = rawUrl || fallback;

  try {
    return new URL(candidate).origin;
  } catch {
    return candidate;
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = getApiTarget(env.VITE_API_BASE_URL);

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/v1': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/ws': {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
