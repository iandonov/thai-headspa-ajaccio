// Create an EMPTY SQLite database file with the latest schema (no seed data).
//
// Run:  npx tsx scripts/init-db.ts [outputPath] [--force]
//   outputPath  destination file (default: spa.db)
//   --force     overwrite an existing file (also removes its -wal/-shm)
//
// The app reseeds its reference content (services, availability, holidays,
// settings) on first boot when the tables are empty — so deploying this file
// yields a clean install with no users or bookings. To push it to Azure, use
// `npm run deploy-db`.
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { createSchema } from '../src/lib/server/db/schema-ddl';

const args = process.argv.slice(2);
const force = args.includes('--force');
const out = args.find((a) => !a.startsWith('--')) ?? 'spa.db';

if (existsSync(out)) {
	if (!force) {
		console.error(`✗ ${out} already exists. Re-run with --force to overwrite it.`);
		process.exit(1);
	}
	// Drop the file and any WAL sidecars so the result is a single clean DB file.
	for (const f of [out, `${out}-wal`, `${out}-shm`]) rmSync(f, { force: true });
}

const dir = dirname(out);
if (dir && dir !== '.') mkdirSync(dir, { recursive: true });

// No WAL pragma here: a freshly created file should stay a single artifact with
// no -wal/-shm sidecars. The app switches the live DB to WAL on boot.
const sqlite = new Database(out);
sqlite.pragma('foreign_keys = ON');
createSchema(sqlite);

const tables = sqlite
	.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
	.all() as { name: string }[];
sqlite.close();

console.log(`✓ Empty database with latest schema created at ${out}`);
console.log(`  Tables: ${tables.map((t) => t.name).join(', ')}`);
