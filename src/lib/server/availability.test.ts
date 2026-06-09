import { describe, it, expect } from 'vitest';
import {
	toMin,
	minToHHMM,
	peakBedUsage,
	hasCapacity,
	computeSlots,
	frenchHolidays,
	type Interval
} from './availability';

const iv = (start: string, end: string, beds = 1): Interval => ({
	s: toMin(start),
	e: toMin(end),
	beds
});

describe('time helpers', () => {
	it('toMin / minToHHMM round-trip', () => {
		expect(toMin('09:00')).toBe(540);
		expect(toMin('18:30')).toBe(1110);
		expect(minToHHMM(540)).toBe('09:00');
		expect(minToHHMM(1110)).toBe('18:30');
		expect(minToHHMM(9 * 60 + 5)).toBe('09:05');
	});
});

describe('peakBedUsage — overlap semantics', () => {
	it('is 0 when there are no existing bookings', () => {
		expect(peakBedUsage([], toMin('09:00'), toMin('10:00'))).toBe(0);
	});

	it('counts a booking that partially overlaps the window', () => {
		// Booking 09:30–10:30 overlaps a 09:00–10:00 candidate window.
		expect(peakBedUsage([iv('09:30', '10:30')], toMin('09:00'), toMin('10:00'))).toBe(1);
	});

	it('does NOT count a back-to-back booking sharing the boundary (half-open)', () => {
		// Booking ends exactly when the window starts → bed already freed.
		expect(peakBedUsage([iv('08:00', '09:00')], toMin('09:00'), toMin('10:00'))).toBe(0);
		// Booking starts exactly when the window ends → never inside it.
		expect(peakBedUsage([iv('10:00', '11:00')], toMin('09:00'), toMin('10:00'))).toBe(0);
	});

	it('sums beds of simultaneously stacked bookings', () => {
		const peak = peakBedUsage(
			[iv('09:00', '10:00', 1), iv('09:00', '10:00', 2)],
			toMin('09:00'),
			toMin('10:00')
		);
		expect(peak).toBe(3);
	});

	it('detects the peak mid-window across multiple interval starts', () => {
		// 09:00–11:00 has one bed, then 10:00–10:30 adds a second → peak 2 at 10:00.
		const peak = peakBedUsage(
			[iv('09:00', '11:00', 1), iv('10:00', '10:30', 1)],
			toMin('09:00'),
			toMin('11:00')
		);
		expect(peak).toBe(2);
	});
});

describe('hasCapacity — bed combinations', () => {
	// Exhaustive matrix: totalBeds {1,2,3} × serviceBeds {1,2} × {0,1,2} existing
	// single-bed bookings overlapping the window. A slot fits iff peak + serviceBeds <= total.
	for (const totalBeds of [1, 2, 3]) {
		for (const serviceBeds of [1, 2]) {
			for (const occupied of [0, 1, 2]) {
				it(`total=${totalBeds} service=${serviceBeds} occupied=${occupied}`, () => {
					const existing = Array.from({ length: occupied }, () => iv('09:00', '10:00', 1));
					const expected = occupied + serviceBeds <= totalBeds;
					expect(
						hasCapacity({
							startMin: toMin('09:00'),
							endMin: toMin('10:00'),
							serviceBeds,
							totalBeds,
							existing
						})
					).toBe(expected);
				});
			}
		}
	}

	it('a multi-bed booking can exhaust capacity on its own', () => {
		// One 2-bed booking + a 2-bed service needs 4 beds; only 3 exist.
		expect(
			hasCapacity({
				startMin: toMin('09:00'),
				endMin: toMin('10:00'),
				serviceBeds: 2,
				totalBeds: 3,
				existing: [iv('09:00', '10:00', 2)]
			})
		).toBe(false);
	});
});

describe('computeSlots — working time windows & duration boundaries', () => {
	const base = { serviceBeds: 1, totalBeds: 3, existing: [] as Interval[] };

	it('09:00–18:00, 30-min service → 18 slots, last at 17:30', () => {
		const slots = computeSlots({ availStartMin: toMin('09:00'), availEndMin: toMin('18:00'), durationMin: 30, ...base });
		expect(slots).toHaveLength(18);
		expect(slots[0].time).toBe('09:00');
		expect(slots.at(-1)!.time).toBe('17:30');
		expect(slots.every((s) => s.available)).toBe(true);
	});

	it('09:00–17:00, 60-min service → 15 slots, last at 16:00', () => {
		const slots = computeSlots({ availStartMin: toMin('09:00'), availEndMin: toMin('17:00'), durationMin: 60, ...base });
		expect(slots).toHaveLength(15);
		expect(slots.at(-1)!.time).toBe('16:00');
	});

	it('75-min service fits exactly up to the closing boundary', () => {
		// 09:00–10:15 window: a single 75-min slot fits exactly (t+75 <= 615).
		const slots = computeSlots({ availStartMin: toMin('09:00'), availEndMin: toMin('10:15'), durationMin: 75, ...base });
		expect(slots).toHaveLength(1);
		expect(slots[0].time).toBe('09:00');
	});

	it('a tight 09:00–10:00 window yields no slot for a 180-min service', () => {
		const slots = computeSlots({ availStartMin: toMin('09:00'), availEndMin: toMin('10:00'), durationMin: 180, ...base });
		expect(slots).toHaveLength(0);
	});

	it('120-min service in 09:00–18:00 → last slot at 16:00', () => {
		const slots = computeSlots({ availStartMin: toMin('09:00'), availEndMin: toMin('18:00'), durationMin: 120, ...base });
		expect(slots.at(-1)!.time).toBe('16:00');
	});

	it('boundary: last 30-min slot fits, none after it', () => {
		const slots = computeSlots({ availStartMin: toMin('09:00'), availEndMin: toMin('09:30'), durationMin: 30, ...base });
		expect(slots).toHaveLength(1);
		expect(slots[0].time).toBe('09:00');
	});
});

describe('computeSlots — capacity interaction with existing bookings', () => {
	it('with 1 bed, an overlapping booking disables only the conflicting slots', () => {
		// A 09:30–10:30 booking blocks any 30-min slot whose window overlaps it.
		const slots = computeSlots({
			availStartMin: toMin('09:00'),
			availEndMin: toMin('12:00'),
			durationMin: 30,
			serviceBeds: 1,
			totalBeds: 1,
			existing: [iv('09:30', '10:30', 1)]
		});
		const byTime = Object.fromEntries(slots.map((s) => [s.time, s.available]));
		expect(byTime['09:00']).toBe(true); // 09:00–09:30 ends at the booking start → free
		expect(byTime['09:30']).toBe(false); // overlaps
		expect(byTime['10:00']).toBe(false); // overlaps
		expect(byTime['10:30']).toBe(true); // starts exactly when booking ends → free
		expect(byTime['11:00']).toBe(true);
	});

	it('with extra beds the same booking no longer blocks the slot', () => {
		const slots = computeSlots({
			availStartMin: toMin('09:00'),
			availEndMin: toMin('11:00'),
			durationMin: 30,
			serviceBeds: 1,
			totalBeds: 2,
			existing: [iv('09:30', '10:30', 1)]
		});
		expect(slots.every((s) => s.available)).toBe(true);
	});

	it('default step is 30 minutes', () => {
		const slots = computeSlots({
			availStartMin: toMin('09:00'),
			availEndMin: toMin('10:00'),
			durationMin: 30,
			serviceBeds: 1,
			totalBeds: 1,
			existing: []
		});
		expect(slots.map((s) => s.time)).toEqual(['09:00', '09:30']);
	});
});

describe('frenchHolidays — the holiday pillar', () => {
	it('returns the 11 jours fériés with fixed dates present', () => {
		const h = frenchHolidays(2026);
		const dates = h.map((x) => x.date);
		expect(h).toHaveLength(11);
		expect(dates).toContain('2026-01-01'); // Jour de l'An
		expect(dates).toContain('2026-05-01'); // Fête du Travail
		expect(dates).toContain('2026-05-08'); // Victoire 1945
		expect(dates).toContain('2026-07-14'); // Fête Nationale
		expect(dates).toContain('2026-08-15'); // Assomption
		expect(dates).toContain('2026-11-01'); // Toussaint
		expect(dates).toContain('2026-11-11'); // Armistice
		expect(dates).toContain('2026-12-25'); // Noël
	});

	it('computes Easter-derived movable feasts correctly', () => {
		// Easter Sunday 2026 = 5 Apr → Easter Monday 6 Apr; Ascension +39 = 14 May.
		const dates2026 = Object.fromEntries(frenchHolidays(2026).map((x) => [x.reason, x.date]));
		expect(dates2026['Lundi de Pâques']).toBe('2026-04-06');
		expect(dates2026['Ascension']).toBe('2026-05-14');
		expect(dates2026['Lundi de Pentecôte']).toBe('2026-05-25');

		// Easter Sunday 2025 = 20 Apr → Easter Monday 21 Apr.
		const dates2025 = Object.fromEntries(frenchHolidays(2025).map((x) => [x.reason, x.date]));
		expect(dates2025['Lundi de Pâques']).toBe('2025-04-21');
	});
});
