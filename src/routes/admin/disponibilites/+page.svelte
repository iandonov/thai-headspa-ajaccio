<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { fly } from 'svelte/transition';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	// Transient confirmation toast — there is no full-page reload to signal a save,
	// so without this the admin can't tell a save succeeded.
	let toast = $state<string | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;
	function showToast(message: string) {
		toast = message;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), 2500);
	}

	// Forms with persistent, editable inputs (hours, capacity) must NOT use the
	// default enhance behaviour: on success it calls the native form.reset(),
	// which reverts every field to its (empty) defaultValue and wipes the value
	// the admin just entered. Keep the values, re-pull the saved state, and
	// surface a toast so the save is unmistakable.
	const saveAnd = (message: string): SubmitFunction => () => async ({ update, result }) => {
		await update({ reset: false });
		if (result.type === 'success') showToast(message);
	};

	const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
	const weekHeaders = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
	const monthNames = [
		'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
		'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
	];

	const pad = (n: number) => String(n).padStart(2, '0');
	const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
	const toHHMM = (n: number) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;

	// Weekly schedule lookups
	const activeWeekdays = $derived(new Set(data.availability.filter((a) => a.active).map((a) => a.dayOfWeek)));
	const usedWeekdays = $derived(new Set(data.availability.map((a) => a.dayOfWeek)));
	const hoursByDay = $derived(
		new Map(data.availability.filter((a) => a.active).map((a) => [a.dayOfWeek, { start: a.startTime, end: a.endTime }]))
	);
	// Weekdays that don't yet have a row — offered in the "add a day" picker.
	const addableDays = $derived([0, 1, 2, 3, 4, 5, 6].filter((d) => !usedWeekdays.has(d)));

	// Date-specific closures keyed by YYYY-MM-DD
	const closedMap = $derived(new Map(data.closures.map((c) => [c.date, c])));

	// Reserved hour ranges keyed by date → Set of blocked slot start times.
	const blocksByDate = $derived.by(() => {
		const m = new Map<string, Set<string>>();
		for (const b of data.slotBlocks) {
			if (!m.has(b.date)) m.set(b.date, new Set());
			m.get(b.date)!.add(b.startTime);
		}
		return m;
	});

	// --- Per-day hours editor -------------------------------------------------
	// Clicking a calendar day selects it and reveals an inline editor where the
	// admin can close the whole day or reserve individual 30-min slots.
	let selectedDate = $state<string | null>(null);
	function selectDate(dateStr: string) {
		selectedDate = selectedDate === dateStr ? null : dateStr;
	}

	const SLOT_STEP = 30;
	const selWeekday = $derived(selectedDate ? new Date(selectedDate + 'T00:00:00').getDay() : -1);
	const selClosure = $derived(selectedDate ? closedMap.get(selectedDate) : undefined);
	const selHours = $derived(selWeekday >= 0 ? hoursByDay.get(selWeekday) : undefined);
	const selBlocked = $derived((selectedDate && blocksByDate.get(selectedDate)) || new Set<string>());

	// 30-min slots spanning the weekday's open window, for the selected date.
	const daySlots = $derived.by(() => {
		if (!selHours) return [] as { start: string; end: string }[];
		const s = toMin(selHours.start);
		const e = toMin(selHours.end);
		const out: { start: string; end: string }[] = [];
		for (let t = s; t + SLOT_STEP <= e; t += SLOT_STEP) {
			out.push({ start: toHHMM(t), end: toHHMM(t + SLOT_STEP) });
		}
		return out;
	});

	function formatDateFR(dateStr: string): string {
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
			weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
		});
	}

	// Local draft of reserved slots for the open editor. Clicking a slot only
	// updates this set in memory; nothing is persisted until the admin saves.
	let draftBlocked = $state(new Set<string>());
	let draftDate = $state<string | null>(null);
	$effect(() => {
		// Re-seed the draft from the saved blocks whenever a different day opens
		// (or the editor closes), so stale selections never leak across dates.
		if (selectedDate !== draftDate) {
			draftDate = selectedDate;
			draftBlocked = new Set(selectedDate ? blocksByDate.get(selectedDate) ?? [] : []);
		}
	});
	function toggleDraft(start: string) {
		const next = new Set(draftBlocked);
		if (next.has(start)) next.delete(start); else next.add(start);
		draftBlocked = next;
	}
	// Unsaved changes vs the persisted set — drives the save button + close guard.
	const draftDirty = $derived.by(() => {
		if (draftBlocked.size !== selBlocked.size) return true;
		for (const s of draftBlocked) if (!selBlocked.has(s)) return true;
		return false;
	});

	function closeEditor() {
		if (draftDirty && !confirm('Des modifications non enregistrées seront perdues. Fermer quand même ?')) return;
		selectedDate = null;
	}

	// Persist the draft slots for the date, then dismiss the editor.
	const saveSlotsAndClose: SubmitFunction = () => async ({ update, result }) => {
		await update({ reset: false });
		if (result.type === 'success') { showToast('Créneaux enregistrés'); selectedDate = null; }
	};

	// Calendar view state — start on the current month.
	const today = new Date();
	const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
	let viewYear = $state(today.getFullYear());
	let viewMonth = $state(today.getMonth()); // 0-based

	function prevMonth() {
		if (viewMonth === 0) { viewMonth = 11; viewYear -= 1; } else { viewMonth -= 1; }
	}
	function nextMonth() {
		if (viewMonth === 11) { viewMonth = 0; viewYear += 1; } else { viewMonth += 1; }
	}

	type Cell = { day: number; dateStr: string; weekday: number; closed: boolean; holiday: boolean; reason: string | null; weeklyOff: boolean; past: boolean };

	function buildCells(year: number, month: number): (Cell | null)[] {
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const firstJsDay = new Date(year, month, 1).getDay(); // 0=Sun
		const leading = (firstJsDay + 6) % 7; // Monday-based offset
		const out: (Cell | null)[] = [];
		for (let i = 0; i < leading; i++) out.push(null);
		for (let d = 1; d <= daysInMonth; d++) {
			const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
			const weekday = new Date(year, month, d).getDay();
			const c = closedMap.get(dateStr);
			out.push({
				day: d,
				dateStr,
				weekday,
				closed: !!c,
				holiday: !!c?.isHoliday,
				reason: c?.reason ?? null,
				weeklyOff: !activeWeekdays.has(weekday),
				past: dateStr < todayStr,
			});
		}
		return out;
	}

	// Two consecutive months: the one in view, and the next. The second is
	// hidden by CSS when the viewport is too narrow to fit it.
	const months = $derived([
		{ year: viewYear, month: viewMonth },
		viewMonth === 11
			? { year: viewYear + 1, month: 0 }
			: { year: viewYear, month: viewMonth + 1 },
	]);
</script>

<svelte:head><title>Disponibilités — Admin</title></svelte:head>

<div class="mb-8">
	<h1 class="font-serif text-3xl text-(--color-charcoal)">Disponibilités</h1>
	<p class="font-sans text-sm text-(--color-stone) mt-1">Horaires hebdomadaires, capacité et calendrier des fermetures</p>
</div>

<!-- ============================ CLOSURES CALENDAR ============================ -->
<section class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 p-6 mb-8">
	<div class="flex items-center justify-between mb-2">
		<h2 class="font-serif text-xl text-(--color-charcoal)">Calendrier des fermetures</h2>
		<div class="flex items-center gap-3">
			<button type="button" onclick={prevMonth} aria-label="Mois précédent"
				class="w-8 h-8 grid place-items-center rounded-sm border border-(--color-sand) hover:bg-(--color-sand)/30">‹</button>
			<button type="button" onclick={nextMonth} aria-label="Mois suivant"
				class="w-8 h-8 grid place-items-center rounded-sm border border-(--color-sand) hover:bg-(--color-sand)/30">›</button>
		</div>
	</div>
	<p class="font-sans text-xs text-(--color-stone) mb-4">Cliquez sur un jour pour le modifier : fermer toute la journée ou réserver des créneaux horaires précis. Les jours fériés français sont fermés par défaut.</p>

	{#snippet monthGrid(year: number, month: number)}
		<div class="flex-1 min-w-0 max-w-md">
			<p class="font-sans text-sm text-(--color-charcoal) text-center mb-2">{monthNames[month]} {year}</p>
			<div class="grid grid-cols-7 gap-1 mb-1">
				{#each weekHeaders as h}
					<div class="text-center font-sans text-xs uppercase tracking-wider text-(--color-stone) py-1">{h}</div>
				{/each}
			</div>
			<div class="grid grid-cols-7 gap-1">
				{#each buildCells(year, month) as cell}
					{#if cell === null}
						<div></div>
					{:else}
						{@const blockedCount = blocksByDate.get(cell.dateStr)?.size ?? 0}
						<button type="button" onclick={() => selectDate(cell.dateStr)}
							title={cell.closed ? (cell.reason ?? 'Fermé') : cell.weeklyOff ? 'Jour de repos' : (hoursByDay.get(cell.weekday) ? `${hoursByDay.get(cell.weekday)?.start}–${hoursByDay.get(cell.weekday)?.end}` : 'Ouvert')}
							class="relative w-full aspect-square rounded-sm border text-left p-1 sm:p-1.5 flex flex-col justify-between transition-colors
								{cell.closed
									? (cell.holiday ? 'bg-amber-50 border-amber-300 hover:bg-amber-100' : 'bg-red-50 border-red-300 hover:bg-red-100')
									: cell.weeklyOff
										? 'bg-(--color-sand)/30 border-(--color-sand) hover:bg-(--color-sand)/50'
										: blockedCount > 0
											? 'bg-(--color-gold)/10 border-(--color-gold)/60 hover:bg-(--color-gold)/20'
											: 'bg-white border-(--color-sand)/60 hover:border-(--color-forest)'}
								{cell.past ? 'opacity-50' : ''}
								{cell.dateStr === selectedDate ? 'ring-2 ring-(--color-gold)' : cell.dateStr === todayStr ? 'ring-2 ring-(--color-forest)' : ''}">
							<span class="font-sans text-xs text-(--color-charcoal)">{cell.day}</span>
							{#if cell.closed}
								<span class="font-sans text-[10px] leading-tight {cell.holiday ? 'text-amber-700' : 'text-red-600'} truncate w-full">{cell.holiday ? cell.reason : 'Fermé'}</span>
							{:else if cell.weeklyOff}
								<span class="font-sans text-[10px] leading-tight text-(--color-stone) truncate w-full">Repos</span>
							{:else if blockedCount > 0}
								<span class="font-sans text-[10px] leading-tight text-(--color-gold-dark) truncate w-full">{blockedCount} rés.</span>
							{:else}
								<span class="font-sans text-[10px] leading-tight text-(--color-forest) truncate w-full">Ouvert</span>
							{/if}
						</button>
					{/if}
				{/each}
			</div>
		</div>
	{/snippet}

	<div class="flex flex-col xl:flex-row gap-8">
		{@render monthGrid(months[0].year, months[0].month)}
		<!-- Second month only appears when there is room (≥ xl) -->
		<div class="hidden xl:block flex-1 min-w-0">
			{@render monthGrid(months[1].year, months[1].month)}
		</div>
	</div>

	<div class="flex flex-wrap gap-4 mt-4 font-sans text-xs text-(--color-stone)">
		<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-white border border-(--color-sand)/60"></span> Ouvert</span>
		<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-(--color-sand)/30 border border-(--color-sand)"></span> Repos hebdo</span>
		<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-(--color-gold)/10 border border-(--color-gold)/60"></span> Partiellement réservé</span>
		<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-red-50 border border-red-300"></span> Fermeture</span>
		<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-amber-50 border border-amber-300"></span> Jour férié</span>
	</div>

	<!-- Per-day editor: appears when a calendar day is selected -->
	{#if selectedDate}
		<div transition:fly={{ y: 8, duration: 150 }} class="mt-6 border-t border-(--color-sand) pt-6">
			<div class="flex items-start justify-between gap-4 mb-4">
				<div>
					<p class="font-serif text-lg text-(--color-charcoal) capitalize">{formatDateFR(selectedDate)}</p>
					{#if selClosure}
						<p class="font-sans text-xs text-red-600 mt-0.5">{selClosure.isHoliday ? `Jour férié — ${selClosure.reason}` : 'Journée fermée'}</p>
					{:else if !selHours}
						<p class="font-sans text-xs text-(--color-stone) mt-0.5">Jour de repos hebdomadaire — ajoutez ce jour aux horaires hebdomadaires pour réserver des créneaux.</p>
					{:else}
						<p class="font-sans text-xs text-(--color-stone) mt-0.5">Ouvert {selHours.start}–{selHours.end} · touchez un créneau pour le réserver (le rendre indisponible).</p>
					{/if}
				</div>
				<button type="button" onclick={closeEditor} aria-label="Fermer l'éditeur"
					class="shrink-0 w-9 h-9 grid place-items-center rounded-sm border border-(--color-sand) hover:bg-(--color-sand)/30 text-(--color-stone)">✕</button>
			</div>

			<!-- Close / reopen the whole day -->
			<form method="POST" action="?/toggleClosure" use:enhance={saveAnd(selClosure ? 'Journée rouverte' : 'Journée fermée')} class="mb-5">
				<input type="hidden" name="date" value={selectedDate} />
				<button type="submit"
					class="w-full sm:w-auto px-4 py-2.5 text-xs font-sans rounded-sm border transition-colors
						{selClosure
							? 'border-(--color-forest) text-(--color-forest) hover:bg-(--color-forest)/5'
							: 'border-red-300 text-red-600 hover:bg-red-50'}">
					{selClosure ? 'Rouvrir toute la journée' : 'Fermer toute la journée'}
				</button>
			</form>

			<!-- Individual hour slots (only when the day is open and a working weekday) -->
			{#if !selClosure && daySlots.length > 0}
				<div class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
					{#each daySlots as slot (slot.start)}
						{@const reserved = draftBlocked.has(slot.start)}
						<button type="button" onclick={() => toggleDraft(slot.start)}
							aria-pressed={reserved}
							title={reserved ? 'Réservé — touchez pour rouvrir' : 'Ouvert — touchez pour réserver'}
							class="w-full py-3 px-2 text-sm font-sans rounded-sm border transition-colors
								{reserved
									? 'bg-(--color-gold)/15 border-(--color-gold) text-(--color-gold-dark) line-through'
									: 'bg-white border-(--color-sand) text-(--color-charcoal) hover:border-(--color-forest)'}">
							{slot.start}
						</button>
					{/each}
				</div>
				<div class="flex flex-wrap gap-4 mt-4 font-sans text-xs text-(--color-stone)">
					<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-white border border-(--color-sand)"></span> Ouvert à la réservation</span>
					<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-(--color-gold)/15 border border-(--color-gold)"></span> Réservé / indisponible</span>
				</div>

				<!-- Save the selected hours and dismiss the editor -->
				<form method="POST" action="?/setSlotBlocks" use:enhance={saveSlotsAndClose}
					class="flex flex-col sm:flex-row sm:items-center gap-3 mt-5 pt-5 border-t border-(--color-sand)">
					<input type="hidden" name="date" value={selectedDate} />
					{#each [...draftBlocked] as st}
						<input type="hidden" name="slot" value={st} />
					{/each}
					<button type="submit" disabled={!draftDirty}
						class="w-full sm:w-auto px-5 py-2.5 bg-(--color-forest) text-white text-xs font-sans rounded-sm hover:bg-(--color-forest-light) transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
						Enregistrer et fermer
					</button>
					<button type="button" onclick={closeEditor}
						class="w-full sm:w-auto px-5 py-2.5 text-xs font-sans rounded-sm border border-(--color-sand) text-(--color-stone) hover:bg-(--color-sand)/30 transition-colors">
						Annuler
					</button>
					{#if draftDirty}
						<span class="font-sans text-xs text-(--color-gold-dark)">Modifications non enregistrées</span>
					{/if}
				</form>
			{/if}
		</div>
	{/if}
</section>

<!-- ============================ CAPACITY (BEDS) ============================ -->
<section class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 p-6 mb-8">
	<h2 class="font-serif text-xl text-(--color-charcoal) mb-1">Capacité</h2>
	<p class="font-sans text-xs text-(--color-stone) mb-4">Nombre de lits/tables pouvant être occupés simultanément.</p>
	<form method="POST" action="?/setBeds" use:enhance={saveAnd('Capacité enregistrée')} class="flex items-end gap-4">
		<div>
			<label for="total-beds" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Lits disponibles</label>
			<input id="total-beds" type="number" name="totalBeds" value={data.totalBeds} min="1" step="1"
				class="border border-(--color-sand) rounded-sm px-3 py-2 text-sm w-28 focus:outline-none focus:border-(--color-forest)" />
		</div>
		<button type="submit" class="px-5 py-2 bg-(--color-forest) text-white text-xs font-sans rounded-sm hover:bg-(--color-forest-light) transition-colors">
			Sauvegarder
		</button>
	</form>
</section>

<!-- ============================ WEEKLY SCHEDULE ============================ -->
<section class="mb-8">
	<h2 class="font-serif text-xl text-(--color-charcoal) mb-1">Horaires hebdomadaires</h2>
	<p class="font-sans text-xs text-(--color-stone) mb-4">Jours et heures de travail récurrents.</p>

	<div class="space-y-4">
		{#each data.availability as avail (avail.id)}
			<div class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 p-5">
				<div class="flex items-center justify-between mb-4">
					<p class="font-serif text-lg text-(--color-charcoal)">{dayNames[avail.dayOfWeek]}</p>
					<form method="POST" action="?/deleteDay" use:enhance
						onsubmit={(e) => { if (!confirm(`Retirer ${dayNames[avail.dayOfWeek]} des jours travaillés ?`)) e.preventDefault(); }}>
						<input type="hidden" name="id" value={avail.id} />
						<button type="submit" class="text-xs font-sans text-red-600 hover:text-red-700 hover:underline">Retirer ce jour</button>
					</form>
				</div>
				<form method="POST" action="?/update" use:enhance={saveAnd('Horaires enregistrés')} class="flex flex-wrap items-end gap-4">
					<input type="hidden" name="id" value={avail.id} />
					<div>
						<label for="start-{avail.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Ouverture</label>
						<input id="start-{avail.id}" type="time" name="startTime" value={avail.startTime}
							class="border border-(--color-sand) rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-(--color-forest)" />
					</div>
					<div>
						<label for="end-{avail.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Fermeture</label>
						<input id="end-{avail.id}" type="time" name="endTime" value={avail.endTime}
							class="border border-(--color-sand) rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-(--color-forest)" />
					</div>
					<div>
						<label for="active-{avail.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Actif</label>
						<input id="active-{avail.id}" type="checkbox" name="active" checked={avail.active}
							class="accent-(--color-forest) w-5 h-5 mt-1" />
					</div>
					<button type="submit" class="px-5 py-2 bg-(--color-forest) text-white text-xs font-sans rounded-sm hover:bg-(--color-forest-light) transition-colors">
						Sauvegarder
					</button>
				</form>
			</div>
		{/each}
	</div>

	{#if addableDays.length > 0}
		<form method="POST" action="?/addDay" use:enhance class="bg-(--color-sand)/20 rounded-(--radius-card) border border-(--color-sand) p-5 mt-4 flex flex-wrap items-end gap-4">
			<div>
				<label for="add-day" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Jour</label>
				<select id="add-day" name="dayOfWeek" class="border border-(--color-sand) rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-(--color-forest)">
					{#each addableDays as d}
						<option value={d}>{dayNames[d]}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="add-start" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Ouverture</label>
				<input id="add-start" type="time" name="startTime" value="09:00"
					class="border border-(--color-sand) rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-(--color-forest)" />
			</div>
			<div>
				<label for="add-end" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Fermeture</label>
				<input id="add-end" type="time" name="endTime" value="18:00"
					class="border border-(--color-sand) rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-(--color-forest)" />
			</div>
			<button type="submit" class="px-5 py-2 bg-(--color-forest) text-white text-xs font-sans rounded-sm hover:bg-(--color-forest-light) transition-colors">
				+ Ajouter ce jour
			</button>
		</form>
	{/if}
</section>

<!-- ============================ SAVE TOAST ============================ -->
{#if toast}
	<div
		role="status"
		aria-live="polite"
		transition:fly={{ y: 12, duration: 200 }}
		class="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-(--color-forest) text-white px-4 py-3 rounded-(--radius-card) shadow-lg font-sans text-sm"
	>
		<svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
		</svg>
		{toast}
	</div>
{/if}
