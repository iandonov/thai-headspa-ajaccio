import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	phone: text('phone'),
	role: text('role', { enum: ['client', 'admin'] }).notNull().default('client'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const services = sqliteTable('services', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	description: text('description').notNull(),
	longDescription: text('long_description'),
	duration: integer('duration').notNull(), // minutes
	price: real('price').notNull(),
	category: text('category').notNull().default('massage'),
	options: text('options'), // JSON array of selectable option labels (for formules)
	imageUrl: text('image_url'),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0),
});

export const availability = sqliteTable('availability', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	dayOfWeek: integer('day_of_week').notNull(), // 0=Sun,1=Mon,...6=Sat
	startTime: text('start_time').notNull(), // "09:00"
	endTime: text('end_time').notNull(),     // "18:00"
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const bookings = sqliteTable('bookings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').references(() => users.id),
	serviceId: integer('service_id').notNull().references(() => services.id),
	guestName: text('guest_name'),
	guestEmail: text('guest_email'),
	guestPhone: text('guest_phone'),
	date: text('date').notNull(),        // "YYYY-MM-DD"
	startTime: text('start_time').notNull(), // "HH:MM"
	endTime: text('end_time').notNull(),
	status: text('status', { enum: ['pending', 'confirmed', 'cancelled', 'completed'] }).notNull().default('pending'),
	notes: text('notes'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const cmsContent = sqliteTable('cms_content', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	key: text('key').notNull().unique(),
	value: text('value').notNull(),
	type: text('type', { enum: ['text', 'html', 'image', 'json'] }).notNull().default('text'),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
