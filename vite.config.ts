import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const rendererRoot = path.resolve(__dirname, 'src', 'renderer');

export default defineConfig({
  root: rendererRoot,
  base: './',
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist', 'renderer'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        settings: path.resolve(rendererRoot, 'settings.html'),
        capsule: path.resolve(rendererRoot, 'capsule.html'),
        quickPanel: path.resolve(rendererRoot, 'quick-panel.html'),
      },
    },
  },
});
