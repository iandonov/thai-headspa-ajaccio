import Database from 'better-sqlite3';
import { createSchema } from './db/schema-ddl';
import { seedDatabase, seedPackages, seedSettings, seedHolidays, seedAdmin, seedCategories } from './db/seed';

let initialized = false;

export function initDatabase() {
	if (initialized) return;
	initialized = true;

	// Must match db/index.ts so tables are created in the same file the app queries.
	const sqlite = new Database(process.env.DATABASE_PATH ?? 'spa.db');
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');

	// Create tables + bring older databases up to the latest schema.
	createSchema(sqlite);

	// Packages are part of the one-time initial seed: only add them when the DB
	// was genuinely empty, so admin-deleted/recategorised packages never return
	// (and a surviving slug can't collide and crash boot).
	const freshlySeeded = seedDatabase();
	if (freshlySeeded) seedPackages();
	seedCategories();
	seedSettings();
	seedHolidays();
	seedAdmin();
}
