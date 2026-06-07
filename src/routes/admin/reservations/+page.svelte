<script lang="ts">
	import { enhance } from '$app/forms';
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

	let filter = $state('all');
	const filtered = $derived(
		filter === 'all' ? data.bookings : data.bookings.filter(b => b.status === filter)
	);
</script>

<svelte:head><title>Réservations — Admin</title></svelte:head>

<div class="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
	<div>
		<h1 class="font-serif text-3xl text-(--color-charcoal)">Réservations</h1>
		<p class="font-sans text-sm text-(--color-stone) mt-1">{data.bookings.length} réservation(s) au total</p>
	</div>
	<div class="flex gap-2">
		{#each ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as f}
			<button
				onclick={() => filter = f}
				class="px-3 py-1.5 font-sans text-xs rounded-sm border transition-all {filter === f ? 'bg-(--color-forest) text-white border-(--color-forest)' : 'bg-white text-(--color-stone) border-(--color-sand) hover:border-(--color-forest)'}"
			>
				{f === 'all' ? 'Tout' : statusLabel[f]}
			</button>
		{/each}
	</div>
</div>

<div class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full">
			<thead class="bg-(--color-cream)">
				<tr>
					{#each ['Client', 'Email', 'Soin', 'Date & Heure', 'Prix', 'Statut', 'Action'] as h}
						<th class="px-4 py-3 text-left font-sans text-xs tracking-wider uppercase text-(--color-stone)">{h}</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-(--color-sand)/40">
				{#each filtered as b}
					<tr class="hover:bg-(--color-cream)/30 transition-colors">
						<td class="px-4 py-3 font-sans text-sm font-medium text-(--color-charcoal)">
							{b.firstName ? b.firstName + ' ' + b.lastName : b.guestName ?? 'Invité'}
						</td>
						<td class="px-4 py-3 font-sans text-xs text-(--color-stone)">{b.email ?? b.guestEmail ?? '—'}</td>
						<td class="px-4 py-3 font-sans text-sm text-(--color-stone)">{b.serviceName}</td>
						<td class="px-4 py-3 font-sans text-sm text-(--color-stone)">
							{new Date(b.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
							· {b.startTime}
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
						<td colspan="7" class="px-4 py-10 text-center font-sans text-sm text-(--color-stone)">Aucune réservation</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
