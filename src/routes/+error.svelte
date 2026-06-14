<script lang="ts">
	import { page } from '$app/stores';

	const messages: Record<number, { title: string; text: string }> = {
		404: {
			title: 'Page Introuvable',
			text: "La page que vous recherchez n'existe pas ou a été déplacée.",
		},
		403: {
			title: 'Accès Refusé',
			text: "Vous n'avez pas l'autorisation d'accéder à cette page.",
		},
	};
	const fallback = {
		title: 'Une Erreur est Survenue',
		text: 'Un problème inattendu est survenu. Veuillez réessayer dans quelques instants.',
	};
	const info = $derived(messages[$page.status] ?? fallback);
</script>

<svelte:head>
	<title>{info.title} — Thai Head Spa Ajaccio</title>
</svelte:head>

<div class="relative bg-fixed-img min-h-screen flex items-center justify-center px-4 pt-20 pb-12" style="background-image: linear-gradient(rgba(26,51,41,0.78), rgba(26,51,41,0.84)), url('/images/bg-stones.jpg');">
	<div class="max-w-lg w-full text-center">
		<div class="glass-panel rounded-(--radius-card) p-12">
			<div class="flex items-center justify-center gap-4 mb-4">
				<div class="h-px w-12 bg-(--color-sand)"></div>
				<span class="text-(--color-gold)">✦</span>
				<div class="h-px w-12 bg-(--color-sand)"></div>
			</div>

			<p class="font-sans text-xs tracking-[0.3em] uppercase text-(--color-gold) mb-3">Erreur {$page.status}</p>
			<h1 class="font-serif text-3xl text-(--color-charcoal) mb-3">{info.title}</h1>
			<p class="font-sans text-base text-(--color-stone) leading-relaxed mb-8">
				{$page.error?.message && $page.error.message !== 'Not Found' ? $page.error.message : info.text}
			</p>

			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<a href="/" class="btn-outline">Retour à l'accueil</a>
				<a href="/services" class="btn-primary">Prendre rendez-vous</a>
			</div>
		</div>
	</div>
</div>
