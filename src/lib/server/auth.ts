import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db/index';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(
	process.env.JWT_SECRET || 'thai-head-spa-ajaccio-secret-2024-change-in-prod'
);

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

export async function createToken(userId: number, role: string): Promise<string> {
	return new SignJWT({ userId, role })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('7d')
		.sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
	try {
		const { payload } = await jwtVerify(token, JWT_SECRET);
		return payload as { userId: number; role: string };
	} catch {
		return null;
	}
}

export async function getUserFromToken(token: string | undefined) {
	if (!token) return null;
	const payload = await verifyToken(token);
	if (!payload) return null;
	const [user] = db.select().from(users).where(eq(users.id, payload.userId)).all();
	return user ?? null;
}
