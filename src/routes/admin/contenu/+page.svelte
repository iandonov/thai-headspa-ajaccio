<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();

	const contentLabels: Record<string, string> = {
		hero_title: 'Titre principal (Hero)',
		hero_subtitle: 'Sous-titre (Hero)',
		hero_tagline: 'Tagline / Description (Hero)',
		about_title: 'Titre section À Propos',
		about_body: 'Corps de texte À Propos (paragraphes séparés par une ligne vide)',
		contact_address: 'Adresse',
		contact_phone: 'Téléphone',
		contact_hours: 'Horaires d\'ouverture',
		contact_email: 'Email de contact',
		closure_notice: 'Avis de fermeture',
	};

	const contentMap = $derived(
		Object.fromEntries(data.content.map(c => [c.key, c.value]))
	);

	let saved = $state<string | null>(null);
	$effect(() => {
		if (form?.success && form?.key) {
			saved = String(form.key);
			setTimeout(() => { saved = null; }, 3000);
		}
	});
</script>

<svelte:head><title>Contenu CMS — Admin</title></svelte:head>

<div class="mb-8">
	<h1 class="font-serif text-3xl text-(--color-charcoal)">Gestion du Contenu</h1>
	<p class="font-sans text-sm text-(--color-stone) mt-1">Modifiez les textes affichés sur le site</p>
</div>

<div class="space-y-6">
	{#each Object.entries(contentLabels) as [key, label]}
		<div class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 p-6">
			<div class="flex items-center justify-between mb-3">
				<label class="font-sans text-sm font-medium text-(--color-charcoal)">{label}</label>
				<span class="font-mono text-xs text-(--color-stone)/50">{key}</span>
			</div>
			{#if saved === key}
				<div class="mb-3 flex items-center gap-2 text-green-600 text-sm font-sans">
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Sauvegardé avec succès
				</div>
			{/if}
			<form method="POST" action="?/update" use:enhance>
				<input type="hidden" name="key" value={key} />
				{#if key === 'about_body' || key === 'contact_hours'}
					<textarea
						name="value"
						rows="5"
						class="input-field mb-3 resize-y font-sans text-sm"
					>{contentMap[key] ?? ''}</textarea>
				{:else}
					<input
						type="text"
						name="value"
						value={contentMap[key] ?? ''}
						class="input-field mb-3"
					/>
				{/if}
				<button type="submit" class="btn-primary text-xs py-2 px-5">Sauvegarder</button>
			</form>
		</div>
	{/each}
</div>
