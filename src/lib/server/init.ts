import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './db/schema';
import { seedDatabase, seedPackages } from './db/seed';

let initialized = false;

export function initDatabase() {
	if (initialized) return;
	initialized = true;

	const sqlite = new Database('spa.db');
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');

	const db = drizzle(sqlite, { schema });

	// Create tables
	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			first_name TEXT NOT NULL,
			last_name TEXT NOT NULL,
			phone TEXT,
			role TEXT NOT NULL DEFAULT 'client',
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
	`);

	// Migration: add `options` column to existing service tables (pre-formules DBs)
	const cols = sqlite.prepare(`PRAGMA table_info(services)`).all() as { name: string }[];
	if (!cols.some((c) => c.name === 'options')) {
		sqlite.exec(`ALTER TABLE services ADD COLUMN options TEXT`);
	}

	seedDatabase();
	seedPackages();
}
