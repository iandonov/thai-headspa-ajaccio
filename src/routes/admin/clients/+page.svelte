<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	let query = $state('');

	const filtered = $derived(
		data.clients.filter((c) => {
			if (!query.trim()) return true;
			const q = query.toLowerCase();
			return (
				`${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
				c.email.toLowerCase().includes(q) ||
				(c.phone ?? '').toLowerCase().includes(q)
			);
		})
	);

	function fmtDate(d: string | Date | null) {
		if (!d) return '—';
		const date = typeof d === 'string' ? new Date(d) : d;
		return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' });
	}
</script>

<svelte:head><title>Clients — Admin</title></svelte:head>

<div class="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
	<div>
		<h1 class="font-serif text-3xl text-(--color-charcoal)">Clients</h1>
		<p class="font-sans text-sm text-(--color-stone) mt-1">{data.clients.length} client(s) enregistré(s) · cliquez pour ouvrir le dossier</p>
	</div>
	<input
		type="search"
		placeholder="Rechercher un client…"
		bind:value={query}
		class="border border-(--color-sand) rounded-sm px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:border-(--color-forest)"
	/>
</div>

<div class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full">
			<thead class="bg-(--color-cream)">
				<tr>
					{#each ['Client', 'Contact', 'Inscrit le', 'Réservations', 'Dernière visite', 'Total dépensé', ''] as h}
						<th class="px-4 py-3 text-left font-sans text-xs tracking-wider uppercase text-(--color-stone)">{h}</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-(--color-sand)/40">
				{#each filtered as c (c.id)}
					<tr
						class="hover:bg-(--color-cream)/40 transition-colors cursor-pointer"
						onclick={() => (window.location.href = `/admin/clients/${c.id}`)}
					>
						<td class="px-4 py-3 font-sans text-sm font-medium text-(--color-charcoal)">
							{c.firstName} {c.lastName}
							{#if c.role === 'admin'}
								<span class="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-(--color-forest)/10 text-(--color-forest) align-middle">Admin</span>
							{/if}
						</td>
						<td class="px-4 py-3 font-sans text-xs text-(--color-stone)">
							<div>{c.email}</div>
							{#if c.phone}<div class="text-(--color-stone)/70">{c.phone}</div>{/if}
						</td>
						<td class="px-4 py-3 font-sans text-sm text-(--color-stone)">{fmtDate(c.createdAt)}</td>
						<td class="px-4 py-3 font-sans text-sm text-(--color-charcoal)">{c.bookingCount}</td>
						<td class="px-4 py-3 font-sans text-sm text-(--color-stone)">{fmtDate(c.lastVisit)}</td>
						<td class="px-4 py-3 font-serif text-base text-(--color-gold)">{c.totalSpent}€</td>
						<td class="px-4 py-3 text-right">
							<a href="/admin/clients/{c.id}" class="font-sans text-xs text-(--color-gold) hover:underline" onclick={(e) => e.stopPropagation()}>Dossier →</a>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="px-4 py-10 text-center font-sans text-sm text-(--color-stone)">Aucun client trouvé</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
