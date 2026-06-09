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

	function fmtDate(d: string | Date | null) {
		if (!d) return '—';
		const date = typeof d === 'string' ? new Date(d) : d;
		return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
	}

	const initials = $derived(
		`${data.client.firstName?.[0] ?? ''}${data.client.lastName?.[0] ?? ''}`.toUpperCase()
	);
	let noteSaved = $state(false);
</script>

<svelte:head><title>{data.client.firstName} {data.client.lastName} — Dossier client</title></svelte:head>

<a href="/admin/clients" class="inline-flex items-center gap-1.5 font-sans text-xs text-(--color-stone) hover:text-(--color-forest) transition-colors mb-6">
	<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
	</svg>
	Tous les clients
</a>

<!-- Identity header -->
<div class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-5">
	<div class="w-16 h-16 rounded-full bg-(--color-forest) text-white grid place-items-center font-serif text-2xl flex-shrink-0">
		{initials}
	</div>
	<div class="flex-1">
		<div class="flex items-center gap-2">
			<h1 class="font-serif text-2xl text-(--color-charcoal)">{data.client.firstName} {data.client.lastName}</h1>
			{#if data.client.role === 'admin'}
				<span class="px-2 py-0.5 rounded-full text-[10px] bg-(--color-forest)/10 text-(--color-forest)">Admin</span>
			{/if}
		</div>
		<div class="flex flex-wrap gap-x-5 gap-y-1 mt-1.5 font-sans text-sm text-(--color-stone)">
			<a href="mailto:{data.client.email}" class="hover:text-(--color-forest)">{data.client.email}</a>
			{#if data.client.phone}
				<a href="tel:{data.client.phone}" class="hover:text-(--color-forest)">{data.client.phone}</a>
			{/if}
			<span>Client depuis {fmtDate(data.client.createdAt)}</span>
		</div>
	</div>
</div>

<!-- Stats -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
	{#each [
		{ label: 'Réservations', value: data.stats.total, color: 'text-(--color-forest)' },
		{ label: 'Terminées', value: data.stats.completed, color: 'text-(--color-charcoal)' },
		{ label: 'À venir', value: data.stats.upcoming, color: 'text-amber-600' },
		{ label: 'Total dépensé', value: data.stats.totalSpent + '€', color: 'text-(--color-gold)' },
	] as stat}
		<div class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 p-5">
			<p class="font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-2">{stat.label}</p>
			<p class="font-serif text-3xl {stat.color}">{stat.value}</p>
		</div>
	{/each}
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
	<!-- History -->
	<div class="lg:col-span-2">
		<h2 class="font-serif text-xl text-(--color-charcoal) mb-3">Historique des réservations</h2>
		<div class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-(--color-cream)">
						<tr>
							{#each ['Soin', 'Date', 'Heure', 'Prix', 'Statut'] as h}
								<th class="px-4 py-3 text-left font-sans text-xs tracking-wider uppercase text-(--color-stone)">{h}</th>
							{/each}
						</tr>
					</thead>
					<tbody class="divide-y divide-(--color-sand)/40">
						{#each data.history as b (b.id)}
							<tr class="hover:bg-(--color-cream)/30 transition-colors">
								<td class="px-4 py-3 font-sans text-sm text-(--color-charcoal)">{b.serviceName ?? '—'}</td>
								<td class="px-4 py-3 font-sans text-sm text-(--color-stone)">{fmtDate(b.date)}</td>
								<td class="px-4 py-3 font-sans text-sm text-(--color-stone)">{b.startTime}</td>
								<td class="px-4 py-3 font-serif text-base text-(--color-gold)">{b.servicePrice ?? 0}€</td>
								<td class="px-4 py-3">
									<span class="px-2 py-0.5 rounded-full text-xs border {statusColor[b.status]}">{statusLabel[b.status]}</span>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="5" class="px-4 py-10 text-center font-sans text-sm text-(--color-stone)">Aucune réservation pour ce client</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- Admin notes -->
	<div>
		<h2 class="font-serif text-xl text-(--color-charcoal) mb-3">Notes internes</h2>
		<form
			method="POST"
			action="?/saveNotes"
			use:enhance={() => async ({ update }) => { await update({ reset: false }); noteSaved = true; }}
			class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 p-5"
		>
			<p class="font-sans text-xs text-(--color-stone) mb-3">
				Préférences, allergies, remarques — visibles uniquement par l'équipe.
			</p>
			<textarea
				name="notes"
				rows="8"
				oninput={() => (noteSaved = false)}
				placeholder="Ex : préfère l'huile de coco, sensible aux huiles essentielles…"
				class="input-field text-sm resize-none w-full">{data.client.notes ?? ''}</textarea>
			<div class="flex items-center justify-between mt-3">
				<span class="font-sans text-xs text-green-600 {noteSaved ? '' : 'invisible'}">✓ Enregistré</span>
				<button type="submit" class="btn-primary text-xs py-2">Enregistrer</button>
			</div>
		</form>
	</div>
</div>
