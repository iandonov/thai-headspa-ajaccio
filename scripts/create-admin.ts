// Run: npx tsx scripts/create-admin.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { users } from '../src/lib/server/db/schema';
import bcrypt from 'bcryptjs';

const sqlite = new Database('spa.db');
const db = drizzle(sqlite);

const email = process.argv[2] || 'admin@thaiheadspa-ajaccio.fr';
const password = process.argv[3] || 'Admin1234!';

const hash = await bcrypt.hash(password, 12);
db.insert(users).values({
	email,
	passwordHash: hash,
	firstName: 'Admin',
	lastName: 'Spa',
	role: 'admin',
	createdAt: new Date(),
}).run();

console.log(`✓ Admin created: ${email} / ${password}`);
sqlite.close();
