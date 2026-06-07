<svelte:head>
	<title>Contact — Thai Head Spa Ajaccio</title>
</svelte:head>

<!-- Fixed background image + translucent panels -->
<div class="relative bg-fixed-img min-h-screen" style="background-image: linear-gradient(rgba(26,51,41,0.78), rgba(26,51,41,0.84)), url('/images/bg-water.jpg');">
	<!-- Page Hero -->
	<div class="pt-36 pb-10 px-6 text-center max-w-4xl mx-auto">
		<p class="section-subheading text-(--color-gold)">Nous Trouver</p>
		<h1 class="font-serif text-5xl md:text-6xl text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]">Contact</h1>
	</div>

	<div class="pb-24">
		<div class="max-w-6xl mx-auto px-6">
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
				<!-- Info -->
				<div class="glass-panel rounded-(--radius-card) p-10">
					<p class="section-subheading">Coordonnées</p>
					<h2 class="section-heading mb-8">Venez Nous Rendre Visite</h2>

					<div class="space-y-8">
						{#each [
							{
								icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
								label: 'Adresse',
								content: '05 rue Comte Bacciochi\n20 000 Ajaccio, Corse',
								href: null,
							},
							{
								icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
								label: 'Téléphone',
								content: '06 07 94 96 63',
								href: 'tel:+33607949663',
							},
							{
								icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
								label: 'Email',
								content: 'contact@thaiheadspa-ajaccio.fr',
								href: 'mailto:contact@thaiheadspa-ajaccio.fr',
							},
						] as item}
							<div class="flex items-start gap-5">
								<div class="w-12 h-12 bg-(--color-forest)/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
									<svg class="w-5 h-5 text-(--color-forest)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={item.icon} />
									</svg>
								</div>
								<div>
									<p class="font-sans text-xs tracking-widest uppercase text-(--color-gold) mb-1">{item.label}</p>
									{#if item.href}
										<a href={item.href} class="font-sans text-base text-(--color-charcoal) hover:text-(--color-gold) transition-colors whitespace-pre-line">{item.content}</a>
									{:else}
										<p class="font-sans text-base text-(--color-charcoal) whitespace-pre-line leading-relaxed">{item.content}</p>
									{/if}
								</div>
							</div>
						{/each}
					</div>

					<!-- Hours -->
					<div class="mt-10 bg-white/50 rounded-(--radius-card) border border-white/60 p-6">
						<p class="font-serif text-lg text-(--color-charcoal) mb-4">Horaires d'Ouverture</p>
						<div class="space-y-2 font-sans text-sm">
							{#each [
								['Lundi', 'Fermé'],
								['Mardi – Vendredi', '9h00 – 18h00'],
								['Samedi', '9h00 – 17h00'],
								['Dimanche', 'Fermé'],
							] as [day, hours]}
								<div class="flex justify-between py-2 border-b border-(--color-sand)/50 last:border-0">
									<span class="text-(--color-stone)">{day}</span>
									<span class="{hours === 'Fermé' ? 'text-(--color-stone)/50' : 'text-(--color-forest) font-medium'}">{hours}</span>
								</div>
							{/each}
						</div>
						<p class="font-sans text-xs text-(--color-stone)/70 mt-4 italic">
							Sur rendez-vous uniquement. Fermeture annuelle du 6 février au 3 mars.
						</p>
					</div>
				</div>

				<!-- Booking reminder -->
				<div class="flex flex-col gap-8">
					<div class="glass-dark rounded-(--radius-card) p-10 text-center">
						<div class="w-16 h-16 border border-(--color-gold)/40 rounded-full flex items-center justify-center mx-auto mb-6">
							<svg class="w-7 h-7 text-(--color-gold)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
						</div>
						<h3 class="font-serif text-2xl text-white mb-3">Réserver en Ligne</h3>
						<p class="font-sans text-sm text-white/70 mb-8 leading-relaxed">
							Choisissez votre soin, votre créneau et confirmez votre rendez-vous en quelques clics.
						</p>
						<a href="/reservation" class="inline-flex items-center gap-2 px-8 py-3.5 bg-(--color-gold) hover:bg-(--color-gold-dark) text-white font-sans text-sm tracking-widest uppercase rounded-sm transition-all duration-300">
							Prendre Rendez-vous
						</a>
					</div>

					<!-- Map placeholder -->
					<div class="glass-card rounded-(--radius-card) p-6 flex-1 flex flex-col items-center justify-center text-center min-h-[200px]">
						<svg class="w-10 h-10 text-(--color-gold)/60 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
						</svg>
						<p class="font-sans text-sm text-(--color-stone)">05 rue Comte Bacciochi</p>
						<p class="font-sans text-sm text-(--color-stone)">20 000 Ajaccio</p>
						<a
							href="https://maps.google.com/?q=05+rue+Comte+Bacciochi+Ajaccio"
							target="_blank"
							rel="noopener"
							class="mt-4 font-sans text-xs text-(--color-gold) hover:underline"
						>
							Ouvrir dans Google Maps →
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
