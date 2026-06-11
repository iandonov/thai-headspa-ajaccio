// Pure, DB-free bed-capacity / slot-availability logic.
//
// The spa has `totalBeds` beds. Each booking occupies its service's `beds` for
// its [start,end) window. A candidate slot is bookable only if the *peak*
// concurrent bed usage during that window, plus the new service's bed cost,
// stays within capacity. This module is the single source of truth for that
// rule — both the slots API and the booking guard import it.

export type Interval = { s: number; e: number; beds: number };

/** "HH:MM" → minutes since midnight. */
export function toMin(hhmm: string): number {
	const [h, m] = hhmm.split(':').map(Number);
	return h * 60 + m;
}

/** Minutes since midnight → zero-padded "HH:MM". */
export function minToHHMM(min: number): string {
	const h = Math.floor(min / 60).toString().padStart(2, '0');
	const m = (min % 60).toString().padStart(2, '0');
	return `${h}:${m}`;
}

/**
 * Maximum number of beds in simultaneous use across [windowStart, windowEnd).
 *
 * Usage only ever rises at an interval's start, so the peak is captured by
 * sampling at the window start plus every existing interval start that falls
 * strictly inside the window. An interval covers a sample point `p` when
 * `s <= p && e > p` (half-open: a booking ending exactly at `p` has freed up).
 */
export function peakBedUsage(
	intervals: Interval[],
	windowStart: number,
	windowEnd: number
): number {
	const points = [
		windowStart,
		...intervals.filter((iv) => iv.s > windowStart && iv.s < windowEnd).map((iv) => iv.s),
	];
	let peak = 0;
	for (const p of points) {
		const used = intervals
			.filter((iv) => iv.s <= p && iv.e > p)
			.reduce((sum, iv) => sum + iv.beds, 0);
		if (used > peak) peak = used;
	}
	return peak;
}

/**
 * A booking blocks its bed from its start until the *next bookable window*
 * after session end + studio prep: the end is rounded up to the next slot
 * boundary of the day's grid (anchored at the working-day start). Thanks to
 * half-open interval semantics a boundary-exact end frees the very next slot.
 */
export function blockUntilNextSlot(endMin: number, gridStartMin: number, step = 30): number {
	return gridStartMin + Math.ceil((endMin - gridStartMin) / step) * step;
}

/** True when a service needing `serviceBeds` fits in [startMin, endMin). */
export function hasCapacity(opts: {
	startMin: number;
	endMin: number;
	serviceBeds: number;
	totalBeds: number;
	existing: Interval[];
}): boolean {
	const peak = peakBedUsage(opts.existing, opts.startMin, opts.endMin);
	return peak + opts.serviceBeds <= opts.totalBeds;
}

/**
 * Walk the working window in `step`-minute increments and report, for each
 * candidate start that fully fits before `availEndMin`, whether a bed is free.
 *
 * `bufferMin` is the studio-preparation time the new service needs after the
 * session: the bed stays occupied for [t, t + duration + buffer) rounded up to
 * the next slot boundary (see blockUntilNextSlot), but the session itself only
 * has to fit inside the working window (cleanup may run past closing). Callers
 * must likewise extend `existing` interval ends with each booking's own buffer.
 */
export function computeSlots(opts: {
	availStartMin: number;
	availEndMin: number;
	durationMin: number;
	serviceBeds: number;
	totalBeds: number;
	existing: Interval[];
	step?: number;
	bufferMin?: number;
}): { time: string; available: boolean }[] {
	const step = opts.step ?? 30;
	const buffer = opts.bufferMin ?? 0;
	const slots: { time: string; available: boolean }[] = [];

	for (let t = opts.availStartMin; t + opts.durationMin <= opts.availEndMin; t += step) {
		const available = hasCapacity({
			startMin: t,
			endMin: blockUntilNextSlot(t + opts.durationMin + buffer, opts.availStartMin, step),
			serviceBeds: opts.serviceBeds,
			totalBeds: opts.totalBeds,
			existing: opts.existing,
		});
		slots.push({ time: minToHHMM(t), available });
	}

	return slots;
}

// --- French public holidays --------------------------------------------------
// Pure date math, kept here (DB-free) so it is unit-testable; seed.ts re-exports
// `frenchHolidays` and uses it to populate the `closures` table.

/** Western (Gregorian) Easter Sunday — Anonymous Gregorian algorithm. */
function computeEaster(year: number): Date {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
	const day = ((h + l - 7 * m + 114) % 31) + 1;
	return new Date(Date.UTC(year, month - 1, day));
}

function fmtDate(d: Date): string {
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
	return new Date(d.getTime() + n * 86_400_000);
}

/** The 11 jours fériés observed in metropolitan France for a given year. */
export function frenchHolidays(year: number): { date: string; reason: string }[] {
	const easter = computeEaster(year);
	return [
		{ date: `${year}-01-01`, reason: "Jour de l'An" },
		{ date: fmtDate(addDays(easter, 1)), reason: 'Lundi de Pâques' },
		{ date: `${year}-05-01`, reason: 'Fête du Travail' },
		{ date: `${year}-05-08`, reason: 'Victoire 1945' },
		{ date: fmtDate(addDays(easter, 39)), reason: 'Ascension' },
		{ date: fmtDate(addDays(easter, 50)), reason: 'Lundi de Pentecôte' },
		{ date: `${year}-07-14`, reason: 'Fête Nationale' },
		{ date: `${year}-08-15`, reason: 'Assomption' },
		{ date: `${year}-11-01`, reason: 'Toussaint' },
		{ date: `${year}-11-11`, reason: 'Armistice 1918' },
		{ date: `${year}-12-25`, reason: 'Noël' },
	];
}
