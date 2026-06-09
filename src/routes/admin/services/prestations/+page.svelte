<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	function formatDuration(min: number) {
		if (min < 60) return min + ' min';
		if (min === 60) return '1h';
		return Math.floor(min / 60) + 'h' + (min % 60 || '');
	}

	// Kept in sync with BASE_CATEGORIES in ../shared.ts (server side).
	const categoryLabels: Record<string, string> = {
		'head-spa': 'Head Spa',
		reflexologie: 'Réflexologie',
		facial: 'Soins du Visage',
		massage: 'Massage Corps',
	};

	let showAddBase = $state(false);
</script>

<svelte:head><title>Prestations à la carte — Admin</title></svelte:head>

<div class="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
	<div>
		<h1 class="font-serif text-3xl text-(--color-charcoal)">Prestations à la carte</h1>
		<p class="font-sans text-sm text-(--color-stone) mt-1">
			Soins individuels proposés à l'unité. Le champ « Lits » indique combien de lits/tables la prestation occupe.
		</p>
	</div>
	<button type="button" onclick={() => (showAddBase = !showAddBase)}
		class="px-4 py-2 bg-(--color-forest) text-white text-xs font-sans rounded-sm hover:bg-(--color-forest-light) transition-colors whitespace-nowrap">
		{showAddBase ? 'Annuler' : '+ Nouvelle prestation'}
	</button>
</div>

{#if showAddBase}
	<form method="POST" action="?/createBase" use:enhance={() => async ({ update }) => { await update(); showAddBase = false; }}
		class="bg-(--color-sand)/20 rounded-(--radius-card) border border-(--color-sand) p-6 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
		<div class="sm:col-span-2">
			<label for="nb-name" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Nom</label>
			<input id="nb-name" type="text" name="name" required class="input-field text-sm" placeholder="Massage du dos" />
		</div>
		<div>
			<label for="nb-category" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Catégorie</label>
			<select id="nb-category" name="category" class="input-field text-sm">
				{#each Object.entries(categoryLabels) as [value, label]}
					<option {value}>{label}</option>
				{/each}
			</select>
		</div>
		<div>
			<label for="nb-beds" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Lits occupés</label>
			<input id="nb-beds" type="number" name="beds" value="1" min="1" step="1" class="input-field text-sm" />
		</div>
		<div>
			<label for="nb-duration" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Durée (min)</label>
			<input id="nb-duration" type="number" name="duration" value="60" min="15" step="15" class="input-field text-sm" />
		</div>
		<div>
			<label for="nb-price" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Prix (€)</label>
			<input id="nb-price" type="number" name="price" value="50" min="0" step="0.5" class="input-field text-sm" />
		</div>
		<div class="sm:col-span-4">
			<label for="nb-description" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Description courte</label>
			<input id="nb-description" type="text" name="description" class="input-field text-sm" placeholder="Massage ciblé aux huiles essentielles" />
		</div>
		<div class="sm:col-span-4">
			<button type="submit" class="btn-primary text-xs py-2">Créer la prestation</button>
		</div>
	</form>
{/if}

<div class="space-y-4">
	{#each data.baseOptions as service (service.id)}
		<div class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 p-6">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h3 class="font-serif text-xl text-(--color-charcoal)">{service.name}</h3>
					<span class="font-sans text-xs text-(--color-stone)">
						{categoryLabels[service.category] ?? service.category} ·
						{service.active ? '✓ Actif' : '✗ Masqué'} · {formatDuration(service.duration)} · {service.price}€ · {service.beds} lit{service.beds > 1 ? 's' : ''}
					</span>
				</div>
				<form method="POST" action="?/delete" use:enhance
					onsubmit={(e) => { if (!confirm(`Supprimer « ${service.name} » ?`)) e.preventDefault(); }}>
					<input type="hidden" name="id" value={service.id} />
					<button type="submit" class="text-xs font-sans text-red-600 hover:text-red-700 hover:underline">Supprimer</button>
				</form>
			</div>
			<form method="POST" action="?/update" use:enhance class="grid grid-cols-1 sm:grid-cols-4 gap-4">
				<input type="hidden" name="id" value={service.id} />
				<div class="sm:col-span-2">
					<label for="name-{service.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Nom</label>
					<input id="name-{service.id}" type="text" name="name" value={service.name} class="input-field text-sm" />
				</div>
				<div>
					<label for="duration-{service.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Durée (min)</label>
					<input id="duration-{service.id}" type="number" name="duration" value={service.duration} min="15" step="15" class="input-field text-sm" />
				</div>
				<div>
					<label for="price-{service.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Prix (€)</label>
					<input id="price-{service.id}" type="number" name="price" value={service.price} min="0" step="0.5" class="input-field text-sm" />
				</div>
				<div>
					<label for="beds-{service.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Lits occupés</label>
					<input id="beds-{service.id}" type="number" name="beds" value={service.beds} min="1" step="1" class="input-field text-sm" />
				</div>
				<div class="flex items-center gap-4 sm:col-span-2">
					<label class="flex items-center gap-2 font-sans text-sm text-(--color-charcoal) cursor-pointer mt-5">
						<input type="checkbox" name="active" checked={service.active} class="accent-(--color-forest)" />
						Actif
					</label>
				</div>
				<div class="flex items-end justify-end">
					<button type="submit" class="btn-primary text-xs py-2">Sauvegarder</button>
				</div>
				<div class="sm:col-span-4">
					<label for="description-{service.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Description courte</label>
					<input id="description-{service.id}" type="text" name="description" value={service.description} class="input-field text-sm" />
				</div>
			</form>
		</div>
	{:else}
		<p class="font-sans text-sm text-(--color-stone) py-10 text-center">Aucune prestation à la carte pour l'instant.</p>
	{/each}
</div>
