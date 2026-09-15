import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({base:'./',build:{rolldownOptions:{input:{
  'site-shell':fileURLToPath(new URL('./src/site-shell.js',import.meta.url)),
  layers:fileURLToPath(new URL('./index.html',import.meta.url)),
  network:fileURLToPath(new URL('./network.html',import.meta.url)),
  'air-station':fileURLToPath(new URL('./air-station.html',import.meta.url)),
  air:fileURLToPath(new URL('./air.html',import.meta.url)),
  season:fileURLToPath(new URL('./season.html',import.meta.url)),
  flock:fileURLToPath(new URL('./flock.html',import.meta.url)),
  'season-data':fileURLToPath(new URL('./season-data.html',import.meta.url)),
  migration:fileURLToPath(new URL('./migration.html',import.meta.url)),
  night:fileURLToPath(new URL('./night.html',import.meta.url)),
  currents:fileURLToPath(new URL('./currents.html',import.meta.url)),
  continent:fileURLToPath(new URL('./continent.html',import.meta.url)),
}}}});
