<svelte:head>
	<title>Réservation confirmée — Thai Head Spa Ajaccio</title>
</svelte:head>

<div class="relative bg-fixed-img min-h-screen flex items-center justify-center px-4 pt-20 pb-12" style="background-image: linear-gradient(rgba(26,51,41,0.78), rgba(26,51,41,0.84)), url('/images/bg-candles.jpg');">
	<div class="max-w-lg w-full text-center">
		<div class="glass-panel rounded-(--radius-card) p-12">
			<div class="w-20 h-20 bg-(--color-forest)/10 rounded-full flex items-center justify-center mx-auto mb-6">
				<svg class="w-10 h-10 text-(--color-forest)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			</div>

			<div class="flex items-center justify-center gap-4 mb-4">
				<div class="h-px w-12 bg-(--color-sand)"></div>
				<span class="text-(--color-gold)">✦</span>
				<div class="h-px w-12 bg-(--color-sand)"></div>
			</div>

			<h1 class="font-serif text-3xl text-(--color-charcoal) mb-3">Réservation Confirmée !</h1>
			<p class="font-sans text-base text-(--color-stone) leading-relaxed mb-8">
				Votre rendez-vous est confirmé. Nous avons hâte de vous accueillir. Retrouvez le détail à tout moment dans votre espace.
			</p>

			<div class="bg-(--color-cream) rounded-sm border border-(--color-sand) p-5 mb-8 text-left">
				<p class="font-sans text-xs tracking-widest uppercase text-(--color-gold) mb-3">À savoir</p>
				<ul class="space-y-2 font-sans text-sm text-(--color-stone)">
					<li class="flex items-start gap-2">
						<span class="text-(--color-gold) mt-0.5">✦</span>
						<span>Besoin de modifier ? Appelez-nous au 06 07 94 96 63</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="text-(--color-gold) mt-0.5">✦</span>
						<span>Merci d'arriver 5 minutes avant l'heure du soin</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="text-(--color-gold) mt-0.5">✦</span>
						<span>Annulation gratuite jusqu'à 24h avant le rendez-vous</span>
					</li>
				</ul>
			</div>

			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<a href="/" class="btn-outline">Retour à l'accueil</a>
				<a href="/compte" class="btn-primary">Mes rendez-vous</a>
			</div>
		</div>
	</div>
</div>
