// Throwaway: screenshot admin pages on the live dev server (5173) with a minted admin JWT.
import { chromium } from '@playwright/test';
import { SignJWT } from 'jose';
import Database from 'better-sqlite3';

const adminId = new Database('spa.db', { readonly: true })
	.prepare(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`)
	.get().id;

const secret = new TextEncoder().encode(
	process.env.JWT_SECRET ?? 'thai-head-spa-ajaccio-secret-2024-change-in-prod'
);
const token = await new SignJWT({ userId: adminId, role: 'admin' })
	.setProtectedHeader({ alg: 'HS256' })
	.setIssuedAt()
	.setExpirationTime('2h')
	.sign(secret);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addCookies([
	{ name: 'session', value: token, domain: 'localhost', path: '/', httpOnly: true },
]);
const page = await ctx.newPage();

const shots = process.argv.slice(2).length
	? process.argv.slice(2).map((s) => {
			// split on the FIRST '=' only — paths may carry a query string
			const i = s.indexOf('=');
			return [s.slice(0, i), s.slice(i + 1)];
	  })
	: [
			['admin-prestations', '/admin/services/prestations'],
			['admin-formules', '/admin/services/formules'],
			['admin-reservations', '/admin/reservations'],
	  ];

for (const [name, path] of shots) {
	await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle' });
	await page.screenshot({ path: `scripts/shot-${name}.png`, fullPage: true });
	console.log(`${name}: ${page.url()}`);
}
await browser.close();
