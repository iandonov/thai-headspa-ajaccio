<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
	const weekHeaders = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
	const monthNames = [
		'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
		'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
	];

	const pad = (n: number) => String(n).padStart(2, '0');

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
	<p class="font-sans text-xs text-(--color-stone) mb-4">Cliquez sur un jour pour le fermer ou le rouvrir. Les jours fériés français sont fermés par défaut.</p>

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
						<form method="POST" action="?/toggleClosure" use:enhance>
							<input type="hidden" name="date" value={cell.dateStr} />
							<button type="submit"
								title={cell.closed ? (cell.reason ?? 'Fermé') : cell.weeklyOff ? 'Jour de repos' : (hoursByDay.get(cell.weekday) ? `${hoursByDay.get(cell.weekday)?.start}–${hoursByDay.get(cell.weekday)?.end}` : 'Ouvert')}
								class="w-full aspect-square rounded-sm border text-left p-1.5 flex flex-col justify-between transition-colors
									{cell.closed
										? (cell.holiday ? 'bg-amber-50 border-amber-300 hover:bg-amber-100' : 'bg-red-50 border-red-300 hover:bg-red-100')
										: cell.weeklyOff
											? 'bg-(--color-sand)/30 border-(--color-sand) hover:bg-(--color-sand)/50'
											: 'bg-white border-(--color-sand)/60 hover:border-(--color-forest)'}
									{cell.past ? 'opacity-50' : ''}
									{cell.dateStr === todayStr ? 'ring-2 ring-(--color-forest)' : ''}">
								<span class="font-sans text-xs text-(--color-charcoal)">{cell.day}</span>
								{#if cell.closed}
									<span class="font-sans text-[10px] leading-tight {cell.holiday ? 'text-amber-700' : 'text-red-600'} truncate">{cell.holiday ? cell.reason : 'Fermé'}</span>
								{:else if cell.weeklyOff}
									<span class="font-sans text-[10px] leading-tight text-(--color-stone)">Repos</span>
								{:else}
									<span class="font-sans text-[10px] leading-tight text-(--color-forest)">Ouvert</span>
								{/if}
							</button>
						</form>
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
		<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-red-50 border border-red-300"></span> Fermeture</span>
		<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-amber-50 border border-amber-300"></span> Jour férié</span>
	</div>
</section>

<!-- ============================ CAPACITY (BEDS) ============================ -->
<section class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 p-6 mb-8">
	<h2 class="font-serif text-xl text-(--color-charcoal) mb-1">Capacité</h2>
	<p class="font-sans text-xs text-(--color-stone) mb-4">Nombre de lits/tables pouvant être occupés simultanément.</p>
	<form method="POST" action="?/setBeds" use:enhance class="flex items-end gap-4">
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
				<form method="POST" action="?/update" use:enhance class="flex flex-wrap items-end gap-4">
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
