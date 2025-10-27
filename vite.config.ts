import { defineConfig } from 'vite'

export default defineConfig(async () => {
  // import dinamico per evitare errori ESM durante la risoluzione del plugin
  const reactPlugin = (await import('@vitejs/plugin-react')).default;
  return {
    plugins: [reactPlugin()],
    server: { port: 5173 }
  };
});
