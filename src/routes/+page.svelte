<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const featured = data.services.slice(0, 3);

	const testimonials = [
		{
			text: "Une expérience absolument merveilleuse. Le head spa m'a complètement transformée, je me sentais légère et apaisée pendant plusieurs jours.",
			author: "Sophie M.",
			service: "Head Spa"
		},
		{
			text: "Professionnalisme et douceur. La réflexologie a soulagé mes douleurs dorsales de façon remarquable. Je recommande vivement !",
			author: "Marie-Claire D.",
			service: "Réflexologie"
		},
		{
			text: "Le massage facial Gua-Sha a sublimé mon teint. Un vrai moment de luxe accessible, dans un cadre chaleureux et apaisant.",
			author: "Isabelle R.",
			service: "Massage Facial"
		},
	];

	function formatDuration(min: number) {
		if (min < 60) return min + ' min';
		if (min === 60) return '1h';
		return Math.floor(min/60) + 'h' + (min % 60 ? (min%60) : '');
	}
</script>

<svelte:head>
	<title>Thai Head Spa & Massage Ajaccio — Soins Thaïlandais Traditionnels</title>
</svelte:head>

<!-- HERO -->
<section class="relative min-h-screen flex items-center justify-center overflow-hidden">
	<div class="absolute inset-0 bg-gradient-to-br from-[#1a3329] via-[#2d4a3e] to-[#1c2e28]"></div>
	<div class="absolute inset-0 opacity-10" style="background-image: url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23c9a96e\' fill-opacity=\'0.4\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'1\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>
	<div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[--color-gold]/10 rounded-full blur-[120px] pointer-events-none"></div>

	<div class="relative z-10 text-center px-6 max-w-4xl mx-auto animate-fade-up">
		<p class="font-sans text-xs tracking-[0.4em] uppercase text-[--color-gold] mb-6">
			{data.cms.hero_subtitle ?? 'Thai Head Spa & Massage'}
		</p>
		<h1 class="font-serif text-5xl md:text-7xl text-white leading-[1.1] mb-6">
			{data.cms.hero_title ?? 'Votre Sanctuaire de Bien-Être'}
		</h1>
		<div class="flex items-center justify-center gap-4 my-8">
			<div class="h-px w-16 bg-[--color-gold]/40"></div>
			<span class="text-[--color-gold]">✦</span>
			<div class="h-px w-16 bg-[--color-gold]/40"></div>
		</div>
		<p class="font-sans text-lg text-white/70 leading-relaxed max-w-xl mx-auto mb-10">
			{data.cms.hero_tagline ?? "Découvrez l'art ancestral du soin capillaire thaïlandais au cœur d'Ajaccio"}
		</p>
		<div class="flex flex-col sm:flex-row gap-4 justify-center">
			<a href="/reservation" class="btn-primary !bg-[#c9a96e] hover:!bg-[#a07840] !border-0 px-10 py-4 text-sm">
				Réserver un Soin
			</a>
			<a href="/services" class="inline-flex items-center gap-2 px-10 py-4 border border-white/40 text-white text-sm tracking-widest uppercase rounded-sm transition-all duration-300 hover:bg-white/10 hover:border-white">
				Découvrir nos Soins
			</a>
		</div>
	</div>

	<div class="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
		<span class="font-sans text-xs text-white/40 tracking-widest uppercase">Découvrir</span>
		<svg class="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7" />
		</svg>
	</div>
</section>

<!-- INFO STRIP -->
<section class="bg-[--color-forest] py-5">
	<div class="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-center">
		<div class="flex items-center gap-3">
			<span class="text-[--color-gold]">✦</span>
			<span class="font-sans text-sm text-white/70 tracking-wider">Sur rendez-vous uniquement</span>
		</div>
		<div class="hidden sm:block w-px h-6 bg-white/20"></div>
		<div class="flex items-center gap-3">
			<span class="text-[--color-gold]">✦</span>
			<span class="font-sans text-sm text-white/70 tracking-wider">05 rue Comte Bacciochi, Ajaccio</span>
		</div>
		<div class="hidden sm:block w-px h-6 bg-white/20"></div>
		<div class="flex items-center gap-3">
			<span class="text-[--color-gold]">✦</span>
			<a href="tel:+33607949663" class="font-sans text-sm text-white/70 hover:text-[--color-gold] transition-colors tracking-wider">06 07 94 96 63</a>
		</div>
	</div>
</section>

<!-- ABOUT -->
<section class="py-24 bg-[--color-warm-white]">
	<div class="max-w-7xl mx-auto px-6">
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
			<div class="relative order-2 lg:order-1">
				<div class="relative bg-gradient-to-br from-[--color-sand]/40 to-[--color-cream] rounded-[--radius-card] aspect-[4/5] flex items-center justify-center overflow-hidden">
					<div class="text-center p-8">
						<div class="w-24 h-24 border border-[--color-gold]/50 rounded-full flex items-center justify-center mx-auto mb-6">
							<span class="text-[--color-gold] text-4xl">✿</span>
						</div>
						<p class="font-serif text-3xl text-[--color-forest]">Thai Head Spa</p>
						<p class="font-sans text-xs tracking-[0.3em] uppercase text-[--color-gold] mt-2">Ajaccio · Corse</p>
						<div class="mt-6 space-y-2 text-sm text-[--color-stone]">
							<p>Soins Capillaires Thaïlandais</p>
							<p>Massages · Réflexologie</p>
							<p>Gua-Sha · Aromathérapie</p>
						</div>
					</div>
				</div>
				<div class="absolute -top-4 -left-4 w-16 h-16 border-l-2 border-t-2 border-[--color-gold]"></div>
				<div class="absolute -bottom-4 -right-4 w-16 h-16 border-r-2 border-b-2 border-[--color-gold]"></div>
			</div>

			<div class="order-1 lg:order-2">
				<p class="section-subheading">Notre Histoire</p>
				<h2 class="section-heading mb-6">{data.cms.about_title ?? "L'Art du Soin Thaïlandais"}</h2>
				<div class="w-12 h-0.5 bg-[--color-gold] mb-8"></div>
				{#each (data.cms.about_body ?? '').split('\n\n').filter(Boolean) as paragraph}
					<p class="font-sans text-base text-[--color-stone] leading-relaxed mb-4">{paragraph}</p>
				{/each}
				<div class="mt-8 flex flex-wrap gap-4">
					<a href="/about" class="btn-outline">En savoir plus</a>
					<a href="/reservation" class="btn-ghost">Réserver →</a>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- SERVICES PREVIEW -->
<section class="py-24 bg-[--color-cream]">
	<div class="max-w-7xl mx-auto px-6">
		<div class="text-center mb-16">
			<p class="section-subheading">Nos Prestations</p>
			<h2 class="section-heading">Soins &amp; Massages</h2>
			<div class="flex items-center justify-center gap-4 mt-4 mb-6">
				<div class="h-px w-16 bg-[--color-sand]"></div>
				<span class="text-[--color-gold]">✦</span>
				<div class="h-px w-16 bg-[--color-sand]"></div>
			</div>
			<p class="font-sans text-base text-[--color-stone] max-w-lg mx-auto">
				Chaque soin est une invitation au voyage, une expérience unique pensée pour votre bien-être total.
			</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			{#each featured as service}
				<a href="/services#{service.slug}" class="card group bg-white">
					<div class="h-1.5 bg-gradient-to-r from-[--color-forest] to-[--color-forest-light]"></div>
					<div class="p-8">
						<div class="flex justify-between items-start mb-5">
							<span class="font-sans text-xs tracking-widest uppercase text-[--color-gold] bg-[--color-gold]/10 px-3 py-1 rounded-full">
								{formatDuration(service.duration)}
							</span>
							<span class="font-serif text-2xl text-[--color-forest]">{service.price}€</span>
						</div>
						<h3 class="font-serif text-xl text-[--color-charcoal] mb-3 group-hover:text-[--color-forest] transition-colors">{service.name}</h3>
						<p class="font-sans text-sm text-[--color-stone] leading-relaxed">{service.description}</p>
						<div class="mt-6 flex items-center gap-2 text-[--color-gold] text-sm font-sans transition-all group-hover:gap-3">
							<span>Découvrir</span>
							<span>→</span>
						</div>
					</div>
				</a>
			{/each}
		</div>

		<div class="text-center mt-12">
			<a href="/services" class="btn-primary">Voir tous nos soins</a>
		</div>
	</div>
</section>

<!-- BOOKING CTA BANNER -->
<section class="relative py-20 overflow-hidden bg-[--color-forest]">
	<div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(ellipse at 20% 50%, #c9a96e 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, #c9a96e 0%, transparent 60%);"></div>
	<div class="relative z-10 max-w-3xl mx-auto px-6 text-center">
		<p class="section-subheading text-[--color-gold]">Sur Rendez-vous</p>
		<h2 class="font-serif text-4xl md:text-5xl text-white mb-6 leading-tight">Offrez-vous un Moment<br/>Hors du Temps</h2>
		<p class="font-sans text-white/60 mb-10 max-w-lg mx-auto leading-relaxed">
			Réservez votre soin en ligne en quelques clics. Nous vous confirmons votre rendez-vous dans les plus brefs délais.
		</p>
		<a href="/reservation" class="inline-flex items-center gap-2 px-12 py-4 bg-[--color-gold] hover:bg-[--color-gold-dark] text-white font-sans text-sm tracking-widest uppercase rounded-sm transition-all duration-300 hover:shadow-lg">
			Prendre Rendez-vous
		</a>
	</div>
</section>

<!-- TESTIMONIALS -->
<section class="py-24 bg-[--color-warm-white]">
	<div class="max-w-7xl mx-auto px-6">
		<div class="text-center mb-16">
			<p class="section-subheading">Avis Clients</p>
			<h2 class="section-heading">Ce que Disent nos Clientes</h2>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			{#each testimonials as t}
				<div class="bg-[--color-cream] rounded-[--radius-card] p-8 relative border border-[--color-sand]/50">
					<span class="absolute top-4 left-6 font-serif text-6xl text-[--color-gold]/20 leading-none pointer-events-none">"</span>
					<p class="font-serif text-lg text-[--color-charcoal] leading-relaxed mb-6 pt-4 italic relative z-10">
						{t.text}
					</p>
					<div class="flex items-center gap-3">
						<div class="w-9 h-9 bg-[--color-gold]/20 rounded-full flex items-center justify-center flex-shrink-0">
							<span class="font-serif text-[--color-gold] font-medium">{t.author[0]}</span>
						</div>
						<div>
							<p class="font-sans text-sm font-medium text-[--color-charcoal]">{t.author}</p>
							<p class="font-sans text-xs text-[--color-stone]">{t.service}</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- CONTACT STRIP -->
<section class="bg-[--color-cream] border-t border-[--color-sand] py-16">
	<div class="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
		{#each [
			{ icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z', label: 'Adresse', text: '05 rue Comte Bacciochi\n20 000 Ajaccio', href: null },
			{ icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', label: 'Téléphone', text: '06 07 94 96 63', href: 'tel:+33607949663' },
			{ icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Horaires', text: 'Mar–Ven : 9h–18h\nSam : 9h–17h', href: null },
		] as item}
			<div>
				<div class="w-12 h-12 border border-[--color-gold] rounded-full flex items-center justify-center mx-auto mb-4">
					<svg class="w-5 h-5 text-[--color-gold]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={item.icon} />
					</svg>
				</div>
				<p class="font-serif text-lg text-[--color-charcoal] mb-2">{item.label}</p>
				{#if item.href}
					<a href={item.href} class="font-sans text-sm text-[--color-stone] hover:text-[--color-gold] transition-colors whitespace-pre-line">{item.text}</a>
				{:else}
					<p class="font-sans text-sm text-[--color-stone] whitespace-pre-line leading-relaxed">{item.text}</p>
				{/if}
			</div>
		{/each}
	</div>
</section>
