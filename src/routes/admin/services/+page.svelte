<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();

	function formatDuration(min: number) {
		if (min < 60) return min + ' min';
		if (min === 60) return '1h';
		return Math.floor(min / 60) + 'h' + (min % 60 || '');
	}

	// Options are stored as a JSON array; show one per line for editing.
	function optionsToText(raw: string | null): string {
		return optionsToArray(raw).join('\n');
	}

	function optionsToArray(raw: string | null): string[] {
		if (!raw) return [];
		try {
			const v = JSON.parse(raw);
			return Array.isArray(v) ? v.filter((o) => typeof o === 'string') : [];
		} catch {
			return [];
		}
	}

	const categoryName = $derived(new Map(data.categories.map((c) => [c.slug, c.name])));

	// Services grouped by category in category order; unknown slugs go last.
	const grouped = $derived.by(() => {
		const groups = data.categories
			.map((c) => ({ key: c.slug, name: c.name, services: data.services.filter((s) => s.category === c.slug) }))
			.filter((g) => g.services.length > 0);
		const known = new Set(data.categories.map((c) => c.slug));
		const orphans = data.services.filter((s) => !known.has(s.category));
		if (orphans.length > 0) groups.push({ key: '__autres', name: 'Autres', services: orphans });
		return groups;
	});

	// ?categorie=<slug> (set from the sidebar submenu) narrows the list down
	// to a single category; no param shows everything.
	const selectedCat = $derived($page.url.searchParams.get('categorie'));
	const visibleGroups = $derived(selectedCat ? grouped.filter((g) => g.key === selectedCat) : grouped);
	const selectedCatName = $derived(selectedCat ? (categoryName.get(selectedCat) ?? selectedCat) : null);

	let showAdd = $state(false);

	// Only one service panel is expanded at a time; clicking Edit on another
	// collapses the previous one.
	let expandedId = $state<number | null>(null);
	function toggleExpand(id: number) {
		expandedId = expandedId === id ? null : id;
	}
</script>

<svelte:head><title>Soins & Tarifs — Admin</title></svelte:head>

<div class="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
	<div>
		<h1 class="font-serif text-3xl text-(--color-charcoal)">Soins & Tarifs</h1>
		<p class="font-sans text-sm text-(--color-stone) mt-1">
			Toutes les prestations et formules, avec leurs options au choix, leur catégorie et le temps de préparation du studio entre deux clients.
			Les catégories se gèrent dans <a href="/admin/services/categories" class="text-(--color-forest) underline hover:no-underline">leur propre écran</a>.
		</p>
	</div>
	<button type="button" onclick={() => (showAdd = !showAdd)}
		class="px-4 py-2 bg-(--color-forest) text-white text-xs font-sans rounded-sm hover:bg-(--color-forest-light) transition-colors whitespace-nowrap">
		{showAdd ? 'Annuler' : '+ Nouvelle prestation'}
	</button>
</div>

{#if form?.error}
	<div class="bg-red-50 border border-red-200 text-red-700 rounded-sm px-4 py-3 text-sm mb-6">{form.error}</div>
{/if}

{#if showAdd}
	<form method="POST" action="?/create" use:enhance={() => async ({ update }) => { await update(); showAdd = false; }}
		class="bg-(--color-sand)/20 rounded-(--radius-card) border border-(--color-sand) p-6 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
		<div class="sm:col-span-2">
			<label for="ns-name" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Nom</label>
			<input id="ns-name" type="text" name="name" required class="input-field text-sm" placeholder="Head Spa — Sérénité Suprême" />
		</div>
		<div class="sm:col-span-2">
			<label for="ns-category" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Catégorie</label>
			<select id="ns-category" name="category" class="input-field text-sm">
				{#each data.categories as cat (cat.id)}
					<option value={cat.slug}>{cat.name}</option>
				{/each}
			</select>
		</div>
		<div>
			<label for="ns-duration" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Durée (min)</label>
			<input id="ns-duration" type="number" name="duration" value="60" min="15" step="15" class="input-field text-sm" />
		</div>
		<div>
			<label for="ns-price" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Prix (€)</label>
			<input id="ns-price" type="number" name="price" value="50" min="0" step="0.5" class="input-field text-sm" />
		</div>
		<div>
			<label for="ns-beds" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Lits occupés</label>
			<input id="ns-beds" type="number" name="beds" value="1" min="1" step="1" class="input-field text-sm" />
		</div>
		<div>
			<label for="ns-buffer" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Préparation (min)</label>
			<input id="ns-buffer" type="number" name="bufferMinutes" value="15" min="0" step="5" class="input-field text-sm" />
		</div>
		<div class="sm:col-span-4">
			<label for="ns-description" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Description courte</label>
			<input id="ns-description" type="text" name="description" class="input-field text-sm" placeholder="Head Spa + Massage Visage." />
		</div>
		<div class="sm:col-span-4">
			<label for="ns-longDescription" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Description détaillée</label>
			<textarea id="ns-longDescription" name="longDescription" rows="2" class="input-field text-sm resize-none"></textarea>
		</div>
		<div class="sm:col-span-4">
			<label for="ns-options" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">
				Options au choix <span class="normal-case text-(--color-stone)/60">(une par ligne, optionnel)</span>
			</label>
			<textarea id="ns-options" name="options" rows="3" class="input-field text-sm resize-none" placeholder="Massage lifting — effet tonifiant &amp; anti-âge&#10;Massage Gua-Sha — pour une peau éclatante et détendue"></textarea>
		</div>
		<div class="sm:col-span-4">
			<button type="submit" class="btn-primary text-xs py-2">Créer la prestation</button>
		</div>
	</form>
{/if}

{#each visibleGroups as group (group.key)}
	<div class="flex items-center gap-3 mt-10 mb-4 first:mt-0">
		<h2 class="font-sans text-xs tracking-[0.25em] uppercase text-(--color-gold)">{group.name}</h2>
		<div class="flex-1 h-px bg-(--color-sand)"></div>
	</div>
	<div class="space-y-4">
		{#each group.services as service (service.id)}
			{@const expanded = expandedId === service.id}
			<div class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 p-6">
				<div class="flex items-start justify-between gap-4 {expanded ? 'mb-4' : ''}">
					<div class="min-w-0">
						<h3 class="font-serif text-xl text-(--color-charcoal)">{service.name}</h3>
						<span class="font-sans text-xs text-(--color-stone)">
							{categoryName.get(service.category) ?? service.category} ·
							{service.active ? '✓ Actif' : '✗ Masqué'} · {formatDuration(service.duration)} · {service.price}€ ·
							{service.beds} lit{service.beds > 1 ? 's' : ''}
							{#if service.bufferMinutes > 0}· {service.bufferMinutes} min de préparation{/if}
						</span>
						{#if !expanded && service.description}
							<p class="font-sans text-sm text-(--color-charcoal)/80 mt-2">{service.description}</p>
						{/if}
						{#if !expanded}
							{@const opts = optionsToArray(service.options)}
							{#if opts.length > 0}
								<div class="mt-2 flex flex-wrap items-center gap-1.5">
									<span class="font-sans text-xs uppercase tracking-wider text-(--color-stone)/70">Options&nbsp;:</span>
									{#each opts as opt (opt)}
										<span class="font-sans text-xs text-(--color-charcoal)/80 bg-(--color-sand)/40 rounded-sm px-2 py-0.5">{opt}</span>
									{/each}
								</div>
							{/if}
						{/if}
					</div>
					<div class="flex items-center gap-2 shrink-0">
						<button type="button" onclick={() => toggleExpand(service.id)}
							class="text-xs font-sans px-3 py-1.5 rounded-sm border border-(--color-forest)/40 text-(--color-forest) hover:bg-(--color-forest)/5 transition-colors whitespace-nowrap">
							{expanded ? 'Réduire' : 'Modifier'}
						</button>
						<form method="POST" action="?/delete" use:enhance
							onsubmit={(e) => { if (!confirm(`Supprimer « ${service.name} » ?`)) e.preventDefault(); }}>
							<input type="hidden" name="id" value={service.id} />
							<button type="submit" title="Supprimer"
								class="text-xs font-sans px-3 py-1.5 rounded-sm border border-red-200 text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap">
								Supprimer
							</button>
						</form>
					</div>
				</div>
				{#if expanded}
				<form method="POST" action="?/update" use:enhance class="grid grid-cols-1 sm:grid-cols-4 gap-4">
					<input type="hidden" name="id" value={service.id} />
					<div class="sm:col-span-2">
						<label for="name-{service.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Nom</label>
						<input id="name-{service.id}" type="text" name="name" value={service.name} class="input-field text-sm" />
					</div>
					<div class="sm:col-span-2">
						<label for="category-{service.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Catégorie</label>
						<select id="category-{service.id}" name="category" value={service.category} class="input-field text-sm">
							{#each data.categories as cat (cat.id)}
								<option value={cat.slug}>{cat.name}</option>
							{/each}
						</select>
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
					<div>
						<label for="buffer-{service.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Préparation (min)</label>
						<input id="buffer-{service.id}" type="number" name="bufferMinutes" value={service.bufferMinutes} min="0" step="5" class="input-field text-sm" />
					</div>
					<div class="sm:col-span-4">
						<label for="description-{service.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Description courte</label>
						<input id="description-{service.id}" type="text" name="description" value={service.description} class="input-field text-sm" />
					</div>
					<div class="sm:col-span-4">
						<label for="longDescription-{service.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Description détaillée</label>
						<textarea id="longDescription-{service.id}" name="longDescription" rows="2" class="input-field text-sm resize-none">{service.longDescription ?? ''}</textarea>
					</div>
					<div class="sm:col-span-4">
						<label for="options-{service.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">
							Options au choix <span class="normal-case text-(--color-stone)/60">(une par ligne — affichées comme choix sélectionnables à la réservation)</span>
						</label>
						<textarea id="options-{service.id}" name="options" rows="3" class="input-field text-sm resize-none" placeholder="Aromathérapie — pour apaiser corps et esprit&#10;Massage Thaï-oil — rééquilibrage énergétique">{optionsToText(service.options)}</textarea>
					</div>
					<div class="sm:col-span-4 flex items-center justify-between pt-2 border-t border-(--color-sand)/60">
						<label class="flex items-center gap-2 font-sans text-sm text-(--color-charcoal) cursor-pointer">
							<input type="checkbox" name="active" checked={service.active} class="accent-(--color-forest)" />
							Actif
						</label>
						<button type="submit" class="btn-primary text-xs py-2">Sauvegarder</button>
					</div>
				</form>
				{/if}
			</div>
		{/each}
	</div>
{:else}
	<p class="font-sans text-sm text-(--color-stone) py-10 text-center">
		{#if selectedCatName}
			Aucune prestation dans la catégorie « {selectedCatName} ».
			<a href="/admin/services" class="text-(--color-forest) underline hover:no-underline">Voir tout</a>
		{:else}
			Aucune prestation pour l'instant.
		{/if}
	</p>
{/each}

