import { defineConfig,devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests',timeout:60000,expect:{timeout:30000},workers:1,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://127.0.0.1:4187/zugunruhe/',trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome'],launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}}},{name:'webkit',use:{...devices['iPhone 13']}}],
  webServer:{command:'node scripts/serve-hosted.mjs',url:'http://127.0.0.1:4187/zugunruhe/',reuseExistingServer:!process.env.CI},
});
