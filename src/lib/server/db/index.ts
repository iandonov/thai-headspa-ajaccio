import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join, dirname } from 'path';
import { mkdirSync } from 'fs';

// In production (Azure App Service) point this at the persistent, deploy-safe
// volume via DATABASE_PATH=/home/data/spa.db; defaults to a local file in dev.
const dbPath = process.env.DATABASE_PATH ?? 'spa.db';
// SQLite won't create missing parent dirs (e.g. /home/data on first boot).
mkdirSync(dirname(dbPath), { recursive: true });
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export function runMigrations() {
	try {
		migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
	} catch {
		// migrations folder may not exist yet during dev
	}
}
