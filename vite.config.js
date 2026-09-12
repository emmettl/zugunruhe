import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({base:'./',build:{rolldownOptions:{input:{
  'site-shell':fileURLToPath(new URL('./src/site-shell.js',import.meta.url)),
  layers:fileURLToPath(new URL('./index.html',import.meta.url)),
  network:fileURLToPath(new URL('./network.html',import.meta.url)),
  night:fileURLToPath(new URL('./night.html',import.meta.url)),
  currents:fileURLToPath(new URL('./currents.html',import.meta.url)),
  continent:fileURLToPath(new URL('./continent.html',import.meta.url)),
}}}});
