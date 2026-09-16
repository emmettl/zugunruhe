import { defineConfig,devices } from '@playwright/test';
const previewPort=process.env.PREVIEW_PORT??'4187';
const previewURL=`http://127.0.0.1:${previewPort}/zugunruhe/`;
export default defineConfig({
  testDir:'./tests',timeout:180000,expect:{timeout:60000},workers:1,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:previewURL,trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[// Keep desktop layout while reducing software WebGL pixel cost for interaction tests.
  {name:'chromium',use:{...devices['Desktop Chrome'],deviceScaleFactor:.5}},{name:'webkit',use:{...devices['iPhone 13']}}],
  webServer:{command:'node scripts/serve-hosted.mjs',url:previewURL,env:{PORT:previewPort},reuseExistingServer:!process.env.CI},
});
