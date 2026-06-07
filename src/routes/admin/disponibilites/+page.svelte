<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
</script>

<svelte:head><title>Disponibilités — Admin</title></svelte:head>

<div class="mb-8">
	<h1 class="font-serif text-3xl text-(--color-charcoal)">Disponibilités</h1>
	<p class="font-sans text-sm text-(--color-stone) mt-1">Gérez vos horaires de travail par jour de la semaine</p>
</div>

<div class="space-y-4">
	{#each data.availability as avail}
		<div class="bg-white rounded-(--radius-card) border border-(--color-sand)/60 p-5">
			<p class="font-serif text-lg text-(--color-charcoal) mb-4">{dayNames[avail.dayOfWeek]}</p>
			<form method="POST" action="?/update" use:enhance class="flex flex-wrap items-end gap-4">
				<input type="hidden" name="id" value={avail.id} />
				<div>
					<label for="start-{avail.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Ouverture</label>
					<input id="start-{avail.id}" type="time" name="startTime" value={avail.startTime}
						class="border border-(--color-sand) rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-(--color-forest)" />
				</div>
				<div>
					<label for="end-{avail.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Fermeture</label>
					<input id="end-{avail.id}" type="time" name="endTime" value={avail.endTime}
						class="border border-(--color-sand) rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-(--color-forest)" />
				</div>
				<div>
					<label for="active-{avail.id}" class="block font-sans text-xs uppercase tracking-wider text-(--color-stone) mb-1">Actif</label>
					<input id="active-{avail.id}" type="checkbox" name="active" checked={avail.active}
						class="accent-(--color-forest) w-5 h-5 mt-1" />
				</div>
				<button type="submit" class="px-5 py-2 bg-(--color-forest) text-white text-xs font-sans rounded-sm hover:bg-(--color-forest-light) transition-colors">
					Sauvegarder
				</button>
			</form>
		</div>
	{/each}
</div>
