// Apply the latest schema + reference seed data to an EXISTING SQLite database
// file, in place and without touching user data (users, bookings stay as-is).
//
// Run:  npx tsx scripts/migrate-db.ts [dbPath]
//   dbPath  database file to migrate (default: spa.db)
//
// This reuses the app's own boot-time initializer: createSchema() creates any
// missing tables and ALTERs forward older ones (categories table, services.
// buffer_minutes, bookings.option, …), and the seed functions are idempotent —
// they only fill tables/rows that are missing (e.g. the default categories).
// It is exactly what the app does on container start; running it here lets you
// migrate a database copy offline (see migrate-db-azure.ps1).
import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';

const target = process.argv[2] ?? 'spa.db';
if (!existsSync(target)) {
	console.error(`✗ Database file not found: ${target}`);
	console.error(`  To create a fresh empty database use 'npm run db:init' instead.`);
	process.exit(1);
}

// The db module binds to DATABASE_PATH at import time, so set it before any
// app module loads (dynamic import below keeps the order guaranteed).
process.env.DATABASE_PATH = target;
const { initDatabase } = await import('../src/lib/server/init');

checkIntegrity(target, 'source database');
const before = snapshot(target);
initDatabase();
const after = snapshot(target);

// Checkpoint the WAL so the migrated result is a single self-contained file
// (initDatabase switches the connection to WAL mode).
const sqlite = new Database(target);
sqlite.pragma('wal_checkpoint(TRUNCATE)');
sqlite.close();
checkIntegrity(target, 'migrated database');

console.log(`✓ Migrated ${target}`);
console.log(`  Tables:     ${before.tables.length} → ${after.tables.length} (${diff(before.tables, after.tables) || 'no new tables'})`);
console.log(`  services:   ${after.serviceCols.length} columns (${diff(before.serviceCols, after.serviceCols) || 'unchanged'})`);
console.log(`  bookings:   ${after.bookingCols.length} columns (${diff(before.bookingCols, after.bookingCols) || 'unchanged'})`);
console.log(`  categories: ${before.categories} → ${after.categories} rows`);
console.log(`  users: ${after.users} · bookings: ${after.bookings} (preserved)`);

// Abort (exit 1) unless SQLite's full integrity check passes — never let a
// damaged database continue toward a production upload.
function checkIntegrity(path: string, label: string) {
	const db = new Database(path);
	const rows = db.prepare('PRAGMA integrity_check').all() as Record<string, string>[];
	db.close();
	const results = rows.map((r) => Object.values(r)[0]);
	if (results.length !== 1 || results[0] !== 'ok') {
		console.error(`✗ Integrity check FAILED on the ${label} (${path}):`);
		for (const line of results.slice(0, 10)) console.error(`  ${line}`);
		process.exit(1);
	}
	console.log(`✓ Integrity check ok (${label})`);
}

function snapshot(path: string) {
	const db = new Database(path, { readonly: false });
	const tables = (db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all() as { name: string }[]).map((t) => t.name);
	const cols = (table: string) =>
		tables.includes(table)
			? (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name)
			: [];
	const count = (table: string) =>
		tables.includes(table) ? (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c : 0;
	const result = {
		tables,
		serviceCols: cols('services'),
		bookingCols: cols('bookings'),
		categories: count('categories'),
		users: count('users'),
		bookings: count('bookings'),
	};
	db.close();
	return result;
}

function diff(before: string[], after: string[]): string {
	return after.filter((x) => !before.includes(x)).map((x) => `+${x}`).join(', ');
}
