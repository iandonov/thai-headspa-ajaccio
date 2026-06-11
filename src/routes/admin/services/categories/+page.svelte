<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Catégories — Admin</title></svelte:head>

<div class="mb-8">
	<h1 class="font-serif text-3xl text-(--color-charcoal)">Catégories</h1>
	<p class="font-sans text-sm text-(--color-stone) mt-1">
		Les catégories regroupent les <a href="/admin/services" class="text-(--color-forest) underline hover:no-underline">soins</a>
		sur le site et dans le tunnel de réservation. Une catégorie utilisée par des soins ne peut pas être supprimée.
	</p>
</div>

{#if form?.error}
	<div class="bg-red-50 border border-red-200 text-red-700 rounded-sm px-4 py-3 text-sm mb-6">{form.error}</div>
{/if}

<section class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 p-6">
	<div class="space-y-2">
		{#each data.categories as cat (cat.id)}
			<div class="flex flex-wrap items-center gap-2" data-slug={cat.slug}>
				<form method="POST" action="?/update" use:enhance class="flex items-center gap-2 flex-1 min-w-0">
					<input type="hidden" name="id" value={cat.id} />
					<input type="text" name="name" value={cat.name} aria-label="Nom de la catégorie"
						class="input-field text-sm flex-1 max-w-xs" />
					<span class="font-sans text-xs text-(--color-stone)/60 hidden sm:inline whitespace-nowrap">
						{data.usage[cat.slug] ?? 0} soin(s)
					</span>
					<button type="submit" class="px-3 py-2 bg-(--color-forest) text-white text-xs font-sans rounded-sm hover:bg-(--color-forest-light) transition-colors">
						Renommer
					</button>
				</form>
				<form method="POST" action="?/delete" use:enhance
					onsubmit={(e) => { if (!confirm(`Supprimer la catégorie « ${cat.name} » ?`)) e.preventDefault(); }}>
					<input type="hidden" name="id" value={cat.id} />
					<button type="submit" class="text-xs font-sans text-red-600 hover:text-red-700 hover:underline">Supprimer</button>
				</form>
			</div>
		{:else}
			<p class="font-sans text-sm text-(--color-stone) py-6 text-center">Aucune catégorie.</p>
		{/each}
	</div>

	<form method="POST" action="?/create" use:enhance class="flex flex-wrap items-end gap-2 mt-4 pt-4 border-t border-(--color-sand)/60">
		<div class="flex-1 max-w-xs min-w-48">
			<label for="nc-name" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Nouvelle catégorie</label>
			<input id="nc-name" type="text" name="name" required class="input-field text-sm" placeholder="Soins du Corps" />
		</div>
		<button type="submit" class="px-4 py-2 bg-(--color-forest) text-white text-xs font-sans rounded-sm hover:bg-(--color-forest-light) transition-colors">
			+ Ajouter
		</button>
	</form>
</section>
