import { equal } from 'node:assert';
import { join } from 'node:path';
import { test } from '@playwright/test';
import { Application, fluvial } from '../index.js';

// NOTE: "describe" blocks are not supported in the Playwright test runner,
// otherwise it would be wrapped in such, mostly to aid in organization
// should the need arise to have multiple kinds of tests here.
let app: Application;

test.beforeEach(async () => {
	app = fluvial({
		ssl: {
			certificatePath: join(import.meta.dirname, '..', '..', '..', '..', '.certs', 'e2e-cert.pem'),
			keyPath: join(import.meta.dirname, '..', '..', '..', '..', '.certs', 'e2e-key.pem'),
		},
	});
});

test.afterEach(async (c) => {
	app.close();
});

test('a redirect is triggered in browsers when calling a res.redirect()', async ({ page }) => {
	app.get('/redirect', async (req, res) => {
		await res.redirect('/target');
	});
	
	app.get('/target', async (req, res) => {
		await res.send('You have been redirected!');
	});
	
	app.listen(3491);
	
	await page.goto('https://localhost:3491/redirect');
	
	equal(page.url(), 'https://localhost:3491/target');
});
