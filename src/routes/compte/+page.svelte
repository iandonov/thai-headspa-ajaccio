<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const now = new Date().toISOString().slice(0, 10);
	const upcoming = data.bookings.filter(b => b.date >= now && b.status !== 'cancelled');
	const past = data.bookings.filter(b => b.date < now || b.status === 'completed');

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
		completed: 'bg-[--color-cream] text-[--color-stone] border-[--color-sand]',
	};
</script>

<svelte:head>
	<title>Mon Compte — Thai Head Spa Ajaccio</title>
</svelte:head>

<div class="min-h-screen bg-[--color-cream] pt-24 pb-16">
	<div class="max-w-4xl mx-auto px-6">
		<!-- Header -->
		<div class="mb-10">
			<p class="section-subheading">Espace personnel</p>
			<h1 class="section-heading">Bonjour, {data.user?.firstName}</h1>
		</div>

		<!-- Quick actions -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
			<a href="/reservation" class="card p-6 text-center group">
				<div class="w-12 h-12 bg-[--color-forest]/10 rounded-full flex items-center justify-center mx-auto mb-3">
					<svg class="w-6 h-6 text-[--color-forest]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
				</div>
				<p class="font-serif text-lg text-[--color-charcoal]">Réserver</p>
				<p class="font-sans text-xs text-[--color-stone] mt-1">Prendre un rendez-vous</p>
			</a>
			<a href="/services" class="card p-6 text-center group">
				<div class="w-12 h-12 bg-[--color-gold]/10 rounded-full flex items-center justify-center mx-auto mb-3">
					<svg class="w-6 h-6 text-[--color-gold]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
					</svg>
				</div>
				<p class="font-serif text-lg text-[--color-charcoal]">Nos Soins</p>
				<p class="font-sans text-xs text-[--color-stone] mt-1">Découvrir les prestations</p>
			</a>
			<form method="POST" action="/deconnexion">
				<button type="submit" class="card p-6 text-center w-full group hover:bg-red-50">
					<div class="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
						<svg class="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
						</svg>
					</div>
					<p class="font-serif text-lg text-[--color-charcoal]">Déconnexion</p>
					<p class="font-sans text-xs text-[--color-stone] mt-1">Quitter mon espace</p>
				</button>
			</form>
		</div>

		<!-- Upcoming bookings -->
		<section class="mb-10">
			<h2 class="font-serif text-2xl text-[--color-charcoal] mb-6">Rendez-vous à venir ({upcoming.length})</h2>
			{#if upcoming.length === 0}
				<div class="bg-white rounded-[--radius-card] border border-[--color-sand] p-10 text-center">
					<p class="font-serif text-xl text-[--color-stone] mb-4">Aucun rendez-vous à venir</p>
					<a href="/reservation" class="btn-primary">Réserver maintenant</a>
				</div>
			{:else}
				<div class="space-y-4">
					{#each upcoming as booking}
						<div class="bg-white rounded-[--radius-card] border border-[--color-sand] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
							<div>
								<p class="font-serif text-lg text-[--color-charcoal]">{booking.serviceName}</p>
								<p class="font-sans text-sm text-[--color-stone] mt-1">
									{new Date(booking.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
									· {booking.startTime} – {booking.endTime}
								</p>
							</div>
							<div class="flex items-center gap-3">
								<span class="px-3 py-1 rounded-full text-xs font-sans border {statusColor[booking.status]}">
									{statusLabel[booking.status]}
								</span>
								<span class="font-serif text-lg text-[--color-gold]">{booking.servicePrice}€</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Past bookings -->
		{#if past.length > 0}
			<section>
				<h2 class="font-serif text-2xl text-[--color-charcoal] mb-6">Historique ({past.length})</h2>
				<div class="space-y-3">
					{#each past as booking}
						<div class="bg-white/60 rounded-[--radius-card] border border-[--color-sand]/60 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 opacity-70">
							<div>
								<p class="font-sans text-base text-[--color-charcoal]">{booking.serviceName}</p>
								<p class="font-sans text-sm text-[--color-stone] mt-0.5">
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
	</div>
</div>
