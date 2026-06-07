<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const statusColor: Record<string, string> = {
		pending: 'bg-amber-50 text-amber-700',
		confirmed: 'bg-green-50 text-green-700',
		cancelled: 'bg-red-50 text-red-600',
		completed: 'bg-gray-50 text-gray-600',
	};
	const statusLabel: Record<string, string> = {
		pending: 'En attente',
		confirmed: 'Confirmé',
		cancelled: 'Annulé',
		completed: 'Terminé',
	};
</script>

<svelte:head><title>Admin — Thai Head Spa</title></svelte:head>

<div class="mb-8">
	<h1 class="font-serif text-3xl text-[--color-charcoal]">Tableau de bord</h1>
	<p class="font-sans text-sm text-[--color-stone] mt-1">Vue d'ensemble de votre activité</p>
</div>

<!-- Stats -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
	{#each [
		{ label: 'Réservations totales', value: data.totalBookings, color: 'text-[--color-forest]' },
		{ label: 'En attente', value: data.pendingBookings, color: 'text-amber-600' },
		{ label: 'Clients inscrits', value: data.totalUsers, color: 'text-[--color-charcoal]' },
		{ label: 'Soins actifs', value: data.totalServices, color: 'text-[--color-gold]' },
	] as stat}
		<div class="bg-white rounded-[--radius-card] border border-[--color-sand]/60 p-6">
			<p class="font-sans text-xs uppercase tracking-wider text-[--color-stone] mb-2">{stat.label}</p>
			<p class="font-serif text-4xl {stat.color}">{stat.value}</p>
		</div>
	{/each}
</div>

<!-- Recent bookings -->
<div class="bg-white rounded-[--radius-card] border border-[--color-sand]/60 overflow-hidden">
	<div class="px-6 py-4 border-b border-[--color-sand]/60 flex justify-between items-center">
		<h2 class="font-serif text-xl text-[--color-charcoal]">Dernières Réservations</h2>
		<a href="/admin/reservations" class="font-sans text-xs text-[--color-gold] hover:underline">Voir tout →</a>
	</div>
	<div class="overflow-x-auto">
		<table class="w-full">
			<thead class="bg-[--color-cream]">
				<tr>
					{#each ['Client', 'Soin', 'Date', 'Heure', 'Statut'] as h}
						<th class="px-4 py-3 text-left font-sans text-xs tracking-wider uppercase text-[--color-stone]">{h}</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-[--color-sand]/40">
				{#each data.recentBookings as b}
					<tr class="hover:bg-[--color-cream]/50 transition-colors">
						<td class="px-4 py-3 font-sans text-sm text-[--color-charcoal]">
							{b.firstName ? b.firstName + ' ' + b.lastName : b.guestName ?? 'Invité'}
						</td>
						<td class="px-4 py-3 font-sans text-sm text-[--color-stone]">{b.serviceName}</td>
						<td class="px-4 py-3 font-sans text-sm text-[--color-stone]">
							{new Date(b.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
						</td>
						<td class="px-4 py-3 font-sans text-sm text-[--color-stone]">{b.startTime}</td>
						<td class="px-4 py-3">
							<span class="px-2 py-0.5 rounded-full text-xs {statusColor[b.status]}">{statusLabel[b.status]}</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
