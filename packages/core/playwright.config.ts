import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	use: {
		ignoreHTTPSErrors: true,
	},
	fullyParallel: false,
	timeout: 300000,
	testMatch: /\.e2e\.ts$/,
	projects: [
		{
			name: 'chromium',
			use: devices['Desktop Chrome'],
		},
		{
			name: 'firefox',
			use: devices['Desktop Firefox'],
		},
		{
			name: 'webkit',
			use: devices['Desktop Safari'],
		},
	],
});
