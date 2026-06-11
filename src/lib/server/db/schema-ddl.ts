import type Database from 'better-sqlite3';

// The canonical "latest schema" as executable DDL — the single source of truth
// shared by the app's runtime initializer (init.ts) and the standalone
// scripts/init-db.ts generator. Kept free of side-effect imports (no db/index)
// so it can be applied to any sqlite handle without opening the default file.
//
// Each CREATE is `IF NOT EXISTS`; the trailing ALTERs bring forward older
// databases that predate a column. On a fresh database the ALTER guards are
// simple no-ops, so this produces the current schema either way.
export function createSchema(sqlite: Database.Database): void {
	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			first_name TEXT NOT NULL,
			last_name TEXT NOT NULL,
			phone TEXT,
			role TEXT NOT NULL DEFAULT 'client',
				notes TEXT,
			created_at INTEGER
		);

		CREATE TABLE IF NOT EXISTS services (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			slug TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			description TEXT NOT NULL,
			long_description TEXT,
			duration INTEGER NOT NULL,
			price REAL NOT NULL,
			category TEXT NOT NULL DEFAULT 'massage',
			options TEXT,
			image_url TEXT,
			active INTEGER NOT NULL DEFAULT 1,
			sort_order INTEGER NOT NULL DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS availability (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			day_of_week INTEGER NOT NULL,
			start_time TEXT NOT NULL,
			end_time TEXT NOT NULL,
			active INTEGER NOT NULL DEFAULT 1
		);

		CREATE TABLE IF NOT EXISTS bookings (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER REFERENCES users(id),
			service_id INTEGER NOT NULL REFERENCES services(id),
			guest_name TEXT,
			guest_email TEXT,
			guest_phone TEXT,
			date TEXT NOT NULL,
			start_time TEXT NOT NULL,
			end_time TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'pending',
			notes TEXT,
			created_at INTEGER
		);

		CREATE TABLE IF NOT EXISTS cms_content (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			key TEXT NOT NULL UNIQUE,
			value TEXT NOT NULL,
			type TEXT NOT NULL DEFAULT 'text',
			updated_at INTEGER
		);

		CREATE TABLE IF NOT EXISTS closures (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			date TEXT NOT NULL UNIQUE,
			reason TEXT,
			is_holiday INTEGER NOT NULL DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS categories (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			slug TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0
		);
	`);

	// Migration: add `options` column to existing service tables (pre-formules DBs)
	const cols = sqlite.prepare(`PRAGMA table_info(services)`).all() as { name: string }[];
	if (!cols.some((c) => c.name === 'options')) {
		sqlite.exec(`ALTER TABLE services ADD COLUMN options TEXT`);
	}
	// Migration: add `beds` column to existing service tables (pre-beds DBs)
	if (!cols.some((c) => c.name === 'beds')) {
		sqlite.exec(`ALTER TABLE services ADD COLUMN beds INTEGER NOT NULL DEFAULT 1`);
	}
	// Migration: add `buffer_minutes` (studio prep time between sessions)
	if (!cols.some((c) => c.name === 'buffer_minutes')) {
		sqlite.exec(`ALTER TABLE services ADD COLUMN buffer_minutes INTEGER NOT NULL DEFAULT 0`);
	}

	// Migration: add `option` column to existing bookings tables (selected option chip)
	const bookingCols = sqlite.prepare(`PRAGMA table_info(bookings)`).all() as { name: string }[];
	if (!bookingCols.some((c) => c.name === 'option')) {
		sqlite.exec(`ALTER TABLE bookings ADD COLUMN option TEXT`);
	}

	// Migration: add `notes` column to existing users tables (pre-dossier DBs)
	const userCols = sqlite.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
	if (!userCols.some((c) => c.name === 'notes')) {
		sqlite.exec(`ALTER TABLE users ADD COLUMN notes TEXT`);
	}
}
