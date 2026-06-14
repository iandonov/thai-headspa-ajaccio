<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	let { data }: { data: PageData } = $props();

	let cancellingId = $state<number | null>(null);

	// Set when a non-admin was redirected here from the admin area.
	const deniedAdmin = $derived($page.url.searchParams.get('denied') === 'admin');

	const now = new Date().toISOString().slice(0, 10);
	// Derived so the lists refresh after an inline cancellation re-fetches data.
	const upcoming = $derived(data.bookings.filter(b => b.date >= now && b.status !== 'cancelled' && b.status !== 'completed'));
	const past = $derived(data.bookings.filter(b => b.date < now || b.status === 'completed' || b.status === 'cancelled'));

	const statusLabel: Record<string, string> = {
		pending: 'En attente',
		confirmed: 'Confirmé',
		cancelled: 'Annulé',
		completed: 'Terminé',
	};
	const statusColor: Record<string, string> = {
		pending: 'bg-amber-50 text-amber-700 border-amber-200',
		confirmed: 'bg-green-50 text-green-700 border-green-200',
		cancelled: 'bg-red-50 text-red-600 border-red-200',
		completed: 'bg-(--color-cream) text-(--color-stone) border-(--color-sand)',
	};
</script>

<svelte:head>
	<title>Mon Compte — Thai Head Spa Ajaccio</title>
</svelte:head>

<div class="relative bg-fixed-img min-h-screen pt-28 pb-16" style="background-image: linear-gradient(rgba(26,51,41,0.80), rgba(26,51,41,0.85)), url('/images/bg-leaves.jpg');">
	<div class="max-w-4xl mx-auto px-6">
		<!-- Header -->
		<div class="mb-10">
			<p class="section-subheading text-(--color-gold)">Espace personnel</p>
			<h1 class="font-serif text-4xl md:text-5xl text-white leading-tight drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]">Bonjour, {data.user?.firstName}</h1>
		</div>

		{#if deniedAdmin}
			<div class="flex items-start gap-3 bg-amber-50/95 border border-amber-200 text-amber-800 rounded-(--radius-card) px-5 py-4 mb-8">
				<svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.14A1.5 1.5 0 003.41 20.5h17.18a1.5 1.5 0 001.3-2.5L13.71 3.86a1.5 1.5 0 00-2.42 0z" /></svg>
				<div>
					<p class="font-sans text-sm font-medium">Accès réservé à l'administration</p>
					<p class="font-sans text-xs mt-0.5">Votre compte ne dispose pas des droits d'administrateur. Connectez-vous avec un compte administrateur pour accéder à cette section.</p>
				</div>
			</div>
		{/if}

		<!-- Upcoming bookings -->
		<section class="mb-10">
			<h2 class="font-serif text-2xl text-white mb-6 drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]">Rendez-vous à venir ({upcoming.length})</h2>
			{#if upcoming.length === 0}
				<div class="glass-panel rounded-(--radius-card) p-10 text-center">
					<p class="font-serif text-xl text-(--color-stone) mb-4">Aucun rendez-vous à venir</p>
					<a href="/services" class="btn-primary">Réserver maintenant</a>
				</div>
			{:else}
				<div class="space-y-4">
					{#each upcoming as booking}
						<div class="glass-card rounded-(--radius-card) p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
							<div>
								<p class="font-serif text-lg text-(--color-charcoal)">{booking.serviceName}</p>
								<p class="font-sans text-sm text-(--color-stone) mt-1">
									{new Date(booking.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
									· {booking.startTime} – {booking.endTime}
								</p>
								{#if booking.option}
									<span class="inline-block mt-2 font-sans text-xs px-2.5 py-1 rounded-full bg-(--color-cream) border border-(--color-sand) text-(--color-stone)">{booking.option}</span>
								{/if}
							</div>
							<div class="flex items-center gap-3">
								<span class="px-3 py-1 rounded-full text-xs font-sans border {statusColor[booking.status]}">
									{statusLabel[booking.status]}
								</span>
								<span class="font-serif text-lg text-(--color-gold)">{booking.servicePrice}€</span>
								{#if booking.status === 'pending' || booking.status === 'confirmed'}
									<form
										method="POST"
										action="?/cancel"
										use:enhance={() => {
											cancellingId = booking.id;
											return async ({ update }) => { await update(); cancellingId = null; };
										}}
										onsubmit={(e) => { if (!confirm('Annuler ce rendez-vous ?')) e.preventDefault(); }}
									>
										<input type="hidden" name="id" value={booking.id} />
										<button
											type="submit"
											disabled={cancellingId === booking.id}
											class="font-sans text-xs text-red-500 hover:text-red-600 hover:underline disabled:opacity-50 transition-colors"
										>
											{cancellingId === booking.id ? 'Annulation…' : 'Annuler'}
										</button>
									</form>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Past bookings -->
		{#if past.length > 0}
			<section>
				<h2 class="font-serif text-2xl text-white mb-6 drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]">Historique ({past.length})</h2>
				<div class="space-y-3">
					{#each past as booking}
						<div class="glass-card rounded-(--radius-card) p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 opacity-85">
							<div>
								<p class="font-sans text-base text-(--color-charcoal)">{booking.serviceName}</p>
								<p class="font-sans text-sm text-(--color-stone) mt-0.5">
									{new Date(booking.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
								</p>
							</div>
							<span class="px-3 py-1 rounded-full text-xs font-sans border {statusColor[booking.status]}">
								{statusLabel[booking.status]}
							</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Discreet logout -->
		<div class="mt-12 pt-6 border-t border-white/15 text-center">
			<form method="POST" action="/deconnexion">
				<button type="submit" class="inline-flex items-center gap-2 font-sans text-xs text-white/50 hover:text-white/80 transition-colors">
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
					</svg>
					Déconnexion
				</button>
			</form>
		</div>
	</div>
</div>
