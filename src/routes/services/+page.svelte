<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	function formatDuration(min: number) {
		if (min < 60) return min + ' min';
		if (min === 60) return '1 heure';
		const h = Math.floor(min/60), m = min % 60;
		return h + 'h' + (m ? m + 'min' : '');
	}

	const categories: Record<string, string> = {
		'head-spa': 'Head Spa',
		'reflexologie': 'Réflexologie',
		'facial': 'Soins du Visage',
		'massage': 'Massages Corps',
	};

	const grouped = data.services.reduce((acc, s) => {
		if (!acc[s.category]) acc[s.category] = [];
		acc[s.category].push(s);
		return acc;
	}, {} as Record<string, typeof data.services>);
</script>

<svelte:head>
	<title>Soins & Massages — Thai Head Spa Ajaccio</title>
	<meta name="description" content="Découvrez nos soins : Head Spa thaïlandais, massages corps, réflexologie, massage facial Gua-Sha. Sur rendez-vous à Ajaccio." />
</svelte:head>

<!-- Page Hero -->
<div class="relative bg-[--color-forest] pt-32 pb-20 overflow-hidden">
	<div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(ellipse at 50% 100%, #c9a96e 0%, transparent 60%);"></div>
	<div class="relative max-w-4xl mx-auto px-6 text-center">
		<p class="section-subheading text-[--color-gold]">Prestations</p>
		<h1 class="font-serif text-5xl md:text-6xl text-white leading-tight">Soins &amp; Massages</h1>
		<div class="flex items-center justify-center gap-4 mt-6">
			<div class="h-px w-16 bg-white/20"></div>
			<span class="text-[--color-gold]">✦</span>
			<div class="h-px w-16 bg-white/20"></div>
		</div>
		<p class="font-sans text-white/60 mt-4 max-w-lg mx-auto">
			Des soins inspirés des traditions thaïlandaises, adaptés à vos besoins pour une détente profonde.
		</p>
	</div>
</div>

<div class="bg-[--color-warm-white] py-20">
	<div class="max-w-6xl mx-auto px-6">
		{#each Object.entries(grouped) as [cat, services]}
			<section class="mb-20" id={cat}>
				<div class="flex items-center gap-6 mb-10">
					<div>
						<p class="font-sans text-xs tracking-[0.3em] uppercase text-[--color-gold] mb-1">Catégorie</p>
						<h2 class="font-serif text-3xl text-[--color-charcoal]">{categories[cat] ?? cat}</h2>
					</div>
					<div class="flex-1 h-px bg-[--color-sand]"></div>
				</div>

				<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{#each services as service}
						<div id={service.slug} class="bg-white rounded-[--radius-card] shadow-[--shadow-soft] overflow-hidden flex flex-col group hover:shadow-[--shadow-card] transition-all duration-300">
							<div class="h-1.5 bg-gradient-to-r from-[--color-forest] to-[--color-gold]"></div>
							<div class="p-8 flex-1 flex flex-col">
								<div class="flex justify-between items-start mb-4">
									<span class="inline-block font-sans text-xs tracking-widest uppercase text-[--color-forest] bg-[--color-forest]/8 px-3 py-1.5 rounded-full">
										{formatDuration(service.duration)}
									</span>
									<div class="text-right">
										<span class="font-serif text-3xl text-[--color-gold]">{service.price}€</span>
									</div>
								</div>
								<h3 class="font-serif text-xl text-[--color-charcoal] mb-3">{service.name}</h3>
								<p class="font-sans text-sm text-[--color-stone] font-medium mb-3 italic">{service.description}</p>
								{#if service.longDescription}
									<p class="font-sans text-sm text-[--color-stone] leading-relaxed flex-1">{service.longDescription}</p>
								{/if}
								<div class="mt-6 pt-6 border-t border-[--color-sand]">
									<a href="/reservation?service={service.id}" class="btn-primary w-full justify-center text-xs py-3">
										Réserver ce soin
									</a>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/each}

		<!-- Notice -->
		<div class="bg-[--color-cream] border border-[--color-sand] rounded-[--radius-card] p-8 text-center">
			<p class="font-serif text-xl text-[--color-charcoal] mb-2">Sur Rendez-vous Uniquement</p>
			<p class="font-sans text-sm text-[--color-stone] mb-6">
				Tous nos soins sont proposés sur rendez-vous. Contactez-nous pour vérifier les disponibilités.
			</p>
			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<a href="/reservation" class="btn-primary">Réserver en ligne</a>
				<a href="tel:+33607949663" class="btn-outline">06 07 94 96 63</a>
			</div>
		</div>
	</div>
</div>
