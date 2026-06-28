import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	phone: text('phone'),
	role: text('role', { enum: ['client', 'admin'] }).notNull().default('client'),
	notes: text('notes'), // private admin annotations for the client dossier
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Service categories, editable in the admin. `services.category` stores the
// category slug (kept as text, no FK, so legacy rows with unknown slugs still load).
export const categories = sqliteTable('categories', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	sortOrder: integer('sort_order').notNull().default(0),
	// When true, services in this category can't be booked online — the site
	// shows a "call to book" CTA instead and the reservation flow is blocked.
	phoneOnly: integer('phone_only', { mode: 'boolean' }).notNull().default(false),
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
	options: text('options'), // JSON array of selectable option labels
	beds: integer('beds').notNull().default(1), // how many beds/tables this prestation occupies
	bufferMinutes: integer('buffer_minutes').notNull().default(0), // studio prep time after each session
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
	option: text('option'), // selected option chip (one of the service's `options`)
	notes: text('notes'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Date-specific non-working days (French public holidays seeded by default,
// plus any manual closures the admin adds via the calendar). A date present here
// is closed regardless of the weekly `availability` schedule.
export const closures = sqliteTable('closures', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	date: text('date').notNull().unique(), // "YYYY-MM-DD"
	reason: text('reason'),
	isHoliday: integer('is_holiday', { mode: 'boolean' }).notNull().default(false),
});

// Date-specific blocked time ranges. Unlike `closures` (which shut a whole day),
// each row reserves a single slot window on one date so the admin can keep a day
// open while marking individual hours unbookable. A blocked range consumes the
// full bed capacity for [startTime, endTime), so no booking can overlap it.
export const slotBlocks = sqliteTable('slot_blocks', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	date: text('date').notNull(),            // "YYYY-MM-DD"
	startTime: text('start_time').notNull(), // "HH:MM"
	endTime: text('end_time').notNull(),     // "HH:MM"
});

// Simple key/value store for spa-wide settings (e.g. total_beds capacity).
export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull(),
});

export const cmsContent = sqliteTable('cms_content', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	key: text('key').notNull().unique(),
	value: text('value').notNull(),
	type: text('type', { enum: ['text', 'html', 'image', 'json'] }).notNull().default('text'),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
