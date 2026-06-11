<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const statusColor: Record<string, string> = {
		pending: 'bg-amber-50 text-amber-700 border-amber-200',
		confirmed: 'bg-green-50 text-green-700 border-green-200',
		cancelled: 'bg-red-50 text-red-600 border-red-200',
		completed: 'bg-gray-50 text-gray-600 border-gray-200',
	};
	const statusLabel: Record<string, string> = {
		pending: 'En attente', confirmed: 'Confirmé', cancelled: 'Annulé', completed: 'Terminé',
	};

	const weekHeaders = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
	const monthNames = [
		'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
		'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
	];
	const pad = (n: number) => String(n).padStart(2, '0');

	const activeWeekdays = $derived(new Set(data.availability.map((a) => a.dayOfWeek)));
	const closedMap = $derived(new Map(data.closures.map((c) => [c.date, c])));
	// Count of active (pending/confirmed) bookings per date, shown in the cells.
	const activeCount = $derived.by(() => {
		const m = new Map<string, number>();
		for (const b of data.bookings) {
			if (b.status !== 'pending' && b.status !== 'confirmed') continue;
			m.set(b.date, (m.get(b.date) ?? 0) + 1);
		}
		return m;
	});

	const today = new Date();
	const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
	let viewYear = $state(today.getFullYear());
	let viewMonth = $state(today.getMonth()); // 0-based

	// Default selection (captured once on load): the nearest day from today with
	// active bookings, otherwise today.
	const defaultDate = untrack(() =>
		[...new Set(
			data.bookings
				.filter((b) => (b.status === 'pending' || b.status === 'confirmed') && b.date >= todayStr)
				.map((b) => b.date)
		)].sort()[0] ?? todayStr
	);
	let selectedDate = $state(defaultDate);

	function prevMonth() {
		if (viewMonth === 0) { viewMonth = 11; viewYear -= 1; } else { viewMonth -= 1; }
	}
	function nextMonth() {
		if (viewMonth === 11) { viewMonth = 0; viewYear += 1; } else { viewMonth += 1; }
	}

	type Cell = {
		day: number; dateStr: string; closed: boolean; holiday: boolean; reason: string | null;
		weeklyOff: boolean; past: boolean; status: 'none' | 'partial' | 'full'; count: number;
	};

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
				closed: !!c,
				holiday: !!c?.isHoliday,
				reason: c?.reason ?? null,
				weeklyOff: !activeWeekdays.has(weekday),
				past: dateStr < todayStr,
				status: data.dayStatus[dateStr] ?? 'none',
				count: activeCount.get(dateStr) ?? 0,
			});
		}
		return out;
	}

	const months = $derived([
		{ year: viewYear, month: viewMonth },
		viewMonth === 11
			? { year: viewYear + 1, month: 0 }
			: { year: viewYear, month: viewMonth + 1 },
	]);

	const dayBookings = $derived(
		data.bookings.filter((b) => b.date === selectedDate)
	);

	function formatDateFR(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
	}

	function cellTitle(cell: Cell): string {
		if (cell.closed) return cell.reason ?? 'Fermé';
		if (cell.status === 'full') return 'Complet';
		if (cell.status === 'partial') return `${cell.count} réservation(s)`;
		if (cell.weeklyOff) return 'Jour de repos';
		return 'Aucune réservation';
	}
</script>

<svelte:head><title>Réservations — Admin</title></svelte:head>

<div class="mb-8">
	<h1 class="font-serif text-3xl text-(--color-charcoal)">Réservations</h1>
	<p class="font-sans text-sm text-(--color-stone) mt-1">
		{data.bookings.length} réservation(s) au total · cliquez sur un jour pour voir le détail
	</p>
</div>

<!-- ============================ CALENDAR ============================ -->
<section class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 p-6 mb-8">
	<div class="flex items-center justify-between mb-4">
		<h2 class="font-serif text-xl text-(--color-charcoal)">Calendrier</h2>
		<div class="flex items-center gap-3">
			<button type="button" onclick={prevMonth} aria-label="Mois précédent"
				class="w-8 h-8 grid place-items-center rounded-sm border border-(--color-sand) hover:bg-(--color-sand)/30">‹</button>
			<button type="button" onclick={nextMonth} aria-label="Mois suivant"
				class="w-8 h-8 grid place-items-center rounded-sm border border-(--color-sand) hover:bg-(--color-sand)/30">›</button>
		</div>
	</div>

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
						<button type="button" data-date={cell.dateStr}
							onclick={() => (selectedDate = cell.dateStr)}
							title={cellTitle(cell)}
							class="w-full aspect-square rounded-sm border text-left p-1.5 flex flex-col justify-between transition-colors
								{cell.status === 'full'
									? 'bg-violet-50 border-violet-300 hover:bg-violet-100'
									: cell.status === 'partial'
										? 'bg-blue-50 border-blue-300 hover:bg-blue-100'
										: cell.closed
											? (cell.holiday ? 'bg-amber-50 border-amber-300 hover:bg-amber-100' : 'bg-red-50 border-red-300 hover:bg-red-100')
											: cell.weeklyOff
												? 'bg-(--color-sand)/30 border-(--color-sand) hover:bg-(--color-sand)/50'
												: 'bg-white border-(--color-sand)/60 hover:border-(--color-forest)'}
								{cell.past ? 'opacity-50' : ''}
								{cell.dateStr === selectedDate ? 'ring-2 ring-(--color-forest)' : cell.dateStr === todayStr ? 'ring-1 ring-(--color-gold)' : ''}">
							<span class="font-sans text-xs text-(--color-charcoal)">{cell.day}</span>
							{#if cell.status === 'full'}
								<span class="font-sans text-[10px] leading-tight text-violet-700 truncate">Complet</span>
							{:else if cell.status === 'partial'}
								<span class="font-sans text-[10px] leading-tight text-blue-700 truncate">{cell.count} rés.</span>
							{:else if cell.closed}
								<span class="font-sans text-[10px] leading-tight {cell.holiday ? 'text-amber-700' : 'text-red-600'} truncate">{cell.holiday ? cell.reason : 'Fermé'}</span>
							{:else if cell.weeklyOff}
								<span class="font-sans text-[10px] leading-tight text-(--color-stone)">Repos</span>
							{:else}
								<span class="font-sans text-[10px] leading-tight text-(--color-stone)/50">Libre</span>
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
		<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-white border border-(--color-sand)/60"></span> Rien de réservé</span>
		<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-blue-50 border border-blue-300"></span> Partiellement réservé</span>
		<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-violet-50 border border-violet-300"></span> Complet</span>
		<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-(--color-sand)/30 border border-(--color-sand)"></span> Repos hebdo</span>
		<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-red-50 border border-red-300"></span> Fermeture</span>
		<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-amber-50 border border-amber-300"></span> Jour férié</span>
	</div>
</section>

<!-- ============================ DAY DETAIL ============================ -->
<section class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 overflow-hidden">
	<div class="px-6 pt-5 pb-3 border-b border-(--color-sand)/40">
		<h2 class="font-serif text-xl text-(--color-charcoal) capitalize">{formatDateFR(selectedDate)}</h2>
		<p class="font-sans text-xs text-(--color-stone) mt-0.5">{dayBookings.length} réservation(s) ce jour</p>
	</div>
	<div class="overflow-x-auto">
		<table class="w-full">
			<thead class="bg-(--color-cream)">
				<tr>
					{#each ['Heure', 'Client', 'Soin', 'Option choisie', 'Prix', 'Statut', 'Action'] as h}
						<th class="px-4 py-3 text-left font-sans text-xs tracking-wider uppercase text-(--color-stone)">{h}</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-(--color-sand)/40">
				{#each dayBookings as b (b.id)}
					<tr class="hover:bg-(--color-cream)/30 transition-colors">
						<td class="px-4 py-3 font-sans text-sm text-(--color-charcoal) whitespace-nowrap">{b.startTime} – {b.endTime}</td>
						<td class="px-4 py-3">
							<p class="font-sans text-sm font-medium text-(--color-charcoal)">
								{b.firstName ? b.firstName + ' ' + b.lastName : b.guestName ?? 'Invité'}
							</p>
							<p class="font-sans text-xs text-(--color-stone)">{b.email ?? b.guestEmail ?? '—'}</p>
						</td>
						<td class="px-4 py-3 font-sans text-sm text-(--color-stone)">{b.serviceName}</td>
						<td class="px-4 py-3">
							{#if b.option}
								<span class="inline-block font-sans text-xs px-2.5 py-1 rounded-full bg-(--color-forest)/10 border border-(--color-forest)/30 text-(--color-forest)">{b.option}</span>
							{:else}
								<span class="font-sans text-xs text-(--color-stone)/50">—</span>
							{/if}
							{#if b.notes}
								<p class="font-sans text-xs text-(--color-stone) mt-1 max-w-50 truncate" title={b.notes}>{b.notes}</p>
							{/if}
						</td>
						<td class="px-4 py-3 font-serif text-base text-(--color-gold)">{b.servicePrice}€</td>
						<td class="px-4 py-3">
							<span class="px-2 py-0.5 rounded-full text-xs border {statusColor[b.status]}">{statusLabel[b.status]}</span>
						</td>
						<td class="px-4 py-3">
							<form method="POST" action="?/updateStatus" use:enhance class="flex gap-1">
								<input type="hidden" name="id" value={b.id} />
								<select name="status" class="text-xs border border-(--color-sand) rounded-sm px-2 py-1 bg-white text-(--color-charcoal) focus:outline-none focus:border-(--color-forest)" value={b.status}>
									<option value="pending">En attente</option>
									<option value="confirmed">Confirmer</option>
									<option value="completed">Terminé</option>
									<option value="cancelled">Annuler</option>
								</select>
								<button type="submit" class="px-2 py-1 bg-(--color-forest) text-white text-xs rounded-sm hover:bg-(--color-forest-light) transition-colors">OK</button>
							</form>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="px-4 py-10 text-center font-sans text-sm text-(--color-stone)">Aucune réservation ce jour</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
