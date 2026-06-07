import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'path';

const sqlite = new Database('spa.db');
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
