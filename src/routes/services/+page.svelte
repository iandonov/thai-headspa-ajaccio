<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	function formatDuration(min: number) {
		if (min < 60) return min + ' min';
		if (min === 60) return '1 heure';
		const h = Math.floor(min/60), m = min % 60;
		return h + 'h' + (m ? m + 'min' : '');
	}

	// Categories come from the DB (admin-editable), in their configured order.
	const categories = $derived(
		Object.fromEntries(data.categories.map((c) => [c.slug, c.name])) as Record<string, string>
	);

	function parseOptions(raw: string | null): string[] {
		if (!raw) return [];
		try {
			const v = JSON.parse(raw);
			return Array.isArray(v) ? v : [];
		} catch {
			return [];
		}
	}

	const grouped = $derived(
		data.services.reduce((acc, s) => {
			if (!acc[s.category]) acc[s.category] = [];
			acc[s.category].push(s);
			return acc;
		}, {} as Record<string, typeof data.services>)
	);

	// Order categories to match the DB order, then any extras
	const orderedGroups = $derived(
		[
			...data.categories.map((c) => c.slug).filter((c) => grouped[c]),
			...Object.keys(grouped).filter((c) => !(c in categories)),
		].map((c) => [c, grouped[c]] as const)
	);

	// Selectable options per service card (multi-select, all selected by default);
	// the choices ride along to /reservation.
	let chosenOptions = $state<Record<number, string[]>>({});

	type ServiceRow = { id: number; options: string | null };

	function optionsFor(service: ServiceRow): string[] {
		return chosenOptions[service.id] ?? parseOptions(service.options);
	}

	function toggleOption(service: ServiceRow, opt: string) {
		const current = optionsFor(service);
		chosenOptions[service.id] = current.includes(opt)
			? current.filter((o) => o !== opt)
			: [...current, opt];
	}

	function reserveHref(service: ServiceRow): string {
		return `/reservation?service=${service.id}`
			+ optionsFor(service).map((o) => `&option=${encodeURIComponent(o)}`).join('');
	}
</script>

<svelte:head>
	<title>Soins & Massages — Thai Head Spa Ajaccio</title>
	<meta name="description" content="Découvrez nos soins : Head Spa thaïlandais, massages corps, réflexologie, massage facial Gua-Sha. Sur rendez-vous à Ajaccio." />
</svelte:head>

<!-- Fixed background image + translucent panels -->
<div class="relative bg-fixed-img min-h-screen" style="background-image: linear-gradient(rgba(26,51,41,0.80), rgba(26,51,41,0.85)), url('/images/bg-leaves.jpg');">
	<!-- Page Hero -->
	<div class="pt-36 pb-12 px-6 text-center max-w-4xl mx-auto">
		<p class="section-subheading text-(--color-gold)">Prestations</p>
		<h1 class="font-serif text-5xl md:text-6xl text-white leading-tight drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]">Soins &amp; Massages</h1>
		<div class="flex items-center justify-center gap-4 mt-6">
			<div class="h-px w-16 bg-white/25"></div>
			<span class="text-(--color-gold)">✦</span>
			<div class="h-px w-16 bg-white/25"></div>
		</div>
		<p class="font-sans text-white/70 mt-4 max-w-lg mx-auto">
			Des soins inspirés des traditions thaïlandaises, adaptés à vos besoins pour une détente profonde.
		</p>
	</div>

	<div class="pb-24">
		<div class="max-w-6xl mx-auto px-6">
		{#each orderedGroups as [cat, services]}
			<section class="mb-20" id={cat}>
				<div class="flex items-center gap-6 mb-10">
					<div>
						<p class="font-sans text-xs tracking-[0.3em] uppercase text-(--color-gold) mb-1">Catégorie</p>
						<h2 class="font-serif text-3xl text-white">{categories[cat] ?? cat}</h2>
					</div>
					<div class="flex-1 h-px bg-white/20"></div>
				</div>

				<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{#each services as service}
						<div id={service.slug} class="glass-card rounded-(--radius-card) overflow-hidden flex flex-col group">
							<div class="h-1.5 bg-gradient-to-r from-(--color-forest) to-(--color-gold)"></div>
							<div class="p-8 flex-1 flex flex-col">
								<div class="flex justify-between items-start mb-4">
									<span class="inline-block font-sans text-xs tracking-widest uppercase text-(--color-forest) bg-(--color-forest)/8 px-3 py-1.5 rounded-full">
										{formatDuration(service.duration)}
									</span>
									<div class="text-right">
										<span class="font-serif text-3xl text-(--color-gold)">{service.price}€</span>
									</div>
								</div>
								<h3 class="font-serif text-xl text-(--color-charcoal) mb-3">{service.name}</h3>
								<p class="font-sans text-sm text-(--color-stone) font-medium mb-3 italic">{service.description}</p>
								{#if service.longDescription}
									<p class="font-sans text-sm text-(--color-stone) leading-relaxed flex-1">{service.longDescription}</p>
								{/if}
								{#if parseOptions(service.options).length > 0}
									{@const opts = parseOptions(service.options)}
									<div class="mt-4">
										<p class="font-sans text-[0.7rem] tracking-widest uppercase text-(--color-gold) mb-2">Options au choix</p>
										<div class="flex flex-wrap gap-2">
											{#each opts as opt}
												{@const optSelected = optionsFor(service).includes(opt)}
												<button type="button" onclick={() => toggleOption(service, opt)}
													aria-pressed={optSelected}
													class="font-sans text-xs px-3 py-1.5 rounded-full border transition-all duration-150 cursor-pointer
														{optSelected
															? 'bg-(--color-cream) border-(--color-sand) text-(--color-charcoal)'
															: 'bg-transparent border-transparent text-(--color-stone) hover:border-(--color-sand)'}">
													{opt}
												</button>
											{/each}
										</div>
									</div>
								{/if}
								<div class="mt-6 pt-6 border-t border-(--color-sand)">
									<a href={reserveHref(service)} class="btn-primary w-full justify-center text-xs py-3">
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
		<div class="glass-panel rounded-(--radius-card) p-8 text-center">
			<p class="font-serif text-xl text-(--color-charcoal) mb-2">Sur Rendez-vous Uniquement</p>
			<p class="font-sans text-sm text-(--color-stone) mb-6">
				Tous nos soins sont proposés sur rendez-vous. Contactez-nous pour vérifier les disponibilités.
			</p>
			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<a href="/reservation" class="btn-primary">Réserver en ligne</a>
				<a href="tel:+33607949663" class="btn-outline">06 07 94 96 63</a>
			</div>
		</div>
	</div>
</div>
</div>
