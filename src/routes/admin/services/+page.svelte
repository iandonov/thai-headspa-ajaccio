<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	function formatDuration(min: number) {
		if (min < 60) return min + ' min';
		if (min === 60) return '1h';
		return Math.floor(min/60) + 'h' + (min%60||'');
	}

	// Formule options are stored as a JSON array; show one per line for editing.
	function optionsToText(raw: string | null): string {
		if (!raw) return '';
		try {
			const v = JSON.parse(raw);
			return Array.isArray(v) ? v.join('\n') : '';
		} catch {
			return '';
		}
	}
</script>

<svelte:head><title>Soins & Tarifs — Admin</title></svelte:head>

<div class="mb-8">
	<h1 class="font-serif text-3xl text-(--color-charcoal)">Soins & Tarifs</h1>
	<p class="font-sans text-sm text-(--color-stone) mt-1">Modifier les prestations et leurs tarifs</p>
</div>

<div class="space-y-4">
	{#each data.services as service}
		<div class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 p-6">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h3 class="font-serif text-xl text-(--color-charcoal)">{service.name}</h3>
					<span class="font-sans text-xs text-(--color-stone)">
						{service.active ? '✓ Actif' : '✗ Masqué'} · {formatDuration(service.duration)} · {service.price}€
					</span>
				</div>
			</div>
			<form method="POST" action="?/update" use:enhance class="grid grid-cols-1 sm:grid-cols-4 gap-4">
				<input type="hidden" name="id" value={service.id} />
				<div>
					<label class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Nom</label>
					<input type="text" name="name" value={service.name} class="input-field text-sm" />
				</div>
				<div>
					<label class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Durée (min)</label>
					<input type="number" name="duration" value={service.duration} min="15" step="15" class="input-field text-sm" />
				</div>
				<div>
					<label class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Prix (€)</label>
					<input type="number" name="price" value={service.price} min="0" step="0.5" class="input-field text-sm" />
				</div>
				<div class="flex flex-col gap-3 justify-between">
					<label class="flex items-center gap-2 font-sans text-sm text-(--color-charcoal) cursor-pointer mt-5">
						<input type="checkbox" name="active" checked={service.active} class="accent-(--color-forest)" />
						Actif
					</label>
					<button type="submit" class="btn-primary text-xs py-2">Sauvegarder</button>
				</div>
				<div class="sm:col-span-4">
					<label class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Description courte</label>
					<input type="text" name="description" value={service.description} class="input-field text-sm" />
				</div>
				{#if service.category === 'formule'}
					<div class="sm:col-span-4">
						<label class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">
							Options incluses dans la formule <span class="normal-case text-(--color-stone)/60">(une par ligne)</span>
						</label>
						<textarea name="options" rows="3" class="input-field text-sm resize-none" placeholder="Aromathérapie — pour apaiser corps et esprit&#10;Massage Thaï-oil — rééquilibrage énergétique">{optionsToText(service.options)}</textarea>
					</div>
				{/if}
			</form>
		</div>
	{/each}
</div>
