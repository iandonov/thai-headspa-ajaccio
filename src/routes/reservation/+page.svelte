<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selectedServiceId = $state(data.preselectedServiceId ?? null);
	let selectedOption = $state(data.preselectedOption ?? '');
	let selectedDate = $state('');
	let selectedSlot = $state('');
	let loadingSlots = $state(false);
	let slots = $state<string[]>([]);
	let step = $state(1); // 1: service, 2: date/slot, 3: details

	const selectedService = $derived(data.services.find(s => s.id === selectedServiceId));

	// Compute min date (tomorrow)
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	const minDate = tomorrow.toISOString().slice(0, 10);

	// Generate calendar: next 60 days, skip Sundays & Mondays
	const calendarDays: { date: string; label: string; dayName: string; available: boolean }[] = [];
	for (let i = 1; i <= 60; i++) {
		const d = new Date();
		d.setDate(d.getDate() + i);
		const dow = d.getDay();
		calendarDays.push({
			date: d.toISOString().slice(0, 10),
			label: d.getDate().toString(),
			dayName: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
			available: dow !== 0 && dow !== 1,
		});
	}

	const months = $derived.by(() => {
		const m: Record<string, typeof calendarDays> = {};
		for (const d of calendarDays) {
			const key = d.date.slice(0, 7);
			if (!m[key]) m[key] = [];
			m[key].push(d);
		}
		return m;
	});

	async function fetchSlots() {
		if (!selectedDate || !selectedServiceId) return;
		loadingSlots = true;
		slots = [];
		selectedSlot = '';
		try {
			const r = await fetch(`/api/slots?date=${selectedDate}&serviceId=${selectedServiceId}`);
			const d = await r.json();
			slots = d.slots ?? [];
		} finally {
			loadingSlots = false;
		}
	}

	function selectDate(date: string) {
		selectedDate = date;
		selectedSlot = '';
		fetchSlots();
	}

	function formatDuration(min: number) {
		if (min < 60) return min + ' min';
		if (min === 60) return '1h';
		return Math.floor(min/60) + 'h' + (min%60 || '');
	}

	function formatDateFR(dateStr: string) {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Réservation — Thai Head Spa Ajaccio</title>
</svelte:head>

<div class="relative bg-fixed-img min-h-screen pt-28 pb-16" style="background-image: linear-gradient(rgba(26,51,41,0.80), rgba(26,51,41,0.85)), url('/images/bg-towels.jpg');">
	<div class="max-w-4xl mx-auto px-6">
		<!-- Header -->
		<div class="text-center mb-12">
			<p class="section-subheading text-(--color-gold)">Sur Rendez-vous</p>
			<h1 class="font-serif text-4xl md:text-5xl text-white leading-tight drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]">Réserver un Soin</h1>
			<div class="flex items-center justify-center gap-4 mt-4">
				<div class="h-px w-16 bg-white/25"></div>
				<span class="text-(--color-gold)">✦</span>
				<div class="h-px w-16 bg-white/25"></div>
			</div>
		</div>

		<!-- Progress Steps -->
		<div class="flex items-center justify-center gap-0 mb-12">
			{#each [
				{ n: 1, label: 'Soin' },
				{ n: 2, label: 'Créneau' },
				{ n: 3, label: 'Coordonnées' },
			] as s}
				<div class="flex items-center">
					<div class="flex flex-col items-center">
						<div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-sans font-medium transition-all duration-300
							{step >= s.n ? 'bg-(--color-gold) text-white' : 'bg-white/20 text-white/70'}">
							{#if step > s.n}
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							{:else}
								{s.n}
							{/if}
						</div>
						<span class="font-sans text-xs mt-1 {step >= s.n ? 'text-white' : 'text-white/50'}">{s.label}</span>
					</div>
					{#if s.n < 3}
						<div class="w-16 h-px mx-3 mt-[-12px] {step > s.n ? 'bg-(--color-gold)' : 'bg-white/30'}"></div>
					{/if}
				</div>
			{/each}
		</div>

		{#if form?.error}
			<div class="bg-red-50 border border-red-200 text-red-700 rounded-sm px-4 py-3 text-sm mb-6 text-center">
				{form.error}
			</div>
		{/if}

		<form method="POST">
			<!-- STEP 1: Choose service -->
			{#if step === 1}
				<div class="glass-panel rounded-(--radius-card) p-8">
					<h2 class="font-serif text-2xl text-(--color-charcoal) mb-6">Choisissez votre soin</h2>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
						{#each data.services as service}
							<button
								type="button"
								onclick={() => { if (selectedServiceId !== service.id) selectedOption = ''; selectedServiceId = service.id; }}
								class="text-left p-5 rounded-sm border-2 transition-all duration-200 {selectedServiceId === service.id ? 'border-(--color-forest) bg-(--color-forest)/5' : 'border-(--color-sand) hover:border-(--color-forest)/40'}"
							>
								<div class="flex justify-between items-start mb-2">
									<span class="font-sans text-xs tracking-widest uppercase text-(--color-gold)">{formatDuration(service.duration)}</span>
									<span class="font-serif text-xl text-(--color-forest)">{service.price}€</span>
								</div>
								<p class="font-serif text-base text-(--color-charcoal)">{service.name}</p>
								<p class="font-sans text-xs text-(--color-stone) mt-1 leading-relaxed">{service.description}</p>
								{#if selectedServiceId === service.id}
									<div class="mt-3 flex items-center gap-2 text-(--color-forest)">
										<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
										</svg>
										<span class="font-sans text-xs">Sélectionné</span>
									</div>
								{/if}
							</button>
						{/each}
					</div>
					<div class="flex justify-end">
						<button
							type="button"
							onclick={() => { if (selectedServiceId) step = 2; }}
							disabled={!selectedServiceId}
							class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
						>
							Choisir un créneau →
						</button>
					</div>
				</div>
			{/if}

			<!-- STEP 2: Date + Slot -->
			{#if step === 2}
				<div class="glass-panel rounded-(--radius-card) p-8">
					<!-- Selected service recap -->
					{#if selectedService}
						<div class="flex items-center gap-4 p-4 bg-(--color-forest)/5 rounded-sm border border-(--color-forest)/20 mb-8">
							<div class="flex-1">
								<p class="font-serif text-base text-(--color-charcoal)">{selectedService.name}</p>
								<p class="font-sans text-xs text-(--color-stone)">{formatDuration(selectedService.duration)} · {selectedService.price}€</p>
								{#if selectedOption}
									<p class="font-sans text-xs text-(--color-gold) mt-1">Option : {selectedOption}</p>
								{/if}
							</div>
							<button type="button" onclick={() => { step = 1; }} class="font-sans text-xs text-(--color-gold) hover:underline">Modifier</button>
						</div>
					{/if}

					<h2 class="font-serif text-2xl text-(--color-charcoal) mb-6">Choisissez une date</h2>

					<!-- Calendar -->
					<div class="overflow-x-auto mb-8 -mx-2 px-2">
						{#each Object.entries(months).slice(0, 2) as [month, days]}
							<div class="mb-6">
								<p class="font-sans text-xs tracking-widest uppercase text-(--color-stone) mb-3">
									{new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
								</p>
								<div class="grid grid-cols-7 gap-1.5">
									{#each ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'] as d}
										<div class="text-center font-sans text-xs text-(--color-stone)/60 pb-1">{d}</div>
									{/each}
									{#if days.length > 0}
										{@const firstDay = new Date(days[0].date)}
										{@const offset = (firstDay.getDay() + 6) % 7}
										{#each Array(offset) as _}
											<div></div>
										{/each}
									{/if}
									{#each days as day}
										<button
											type="button"
											onclick={() => day.available && selectDate(day.date)}
											disabled={!day.available}
											class="aspect-square rounded-sm text-sm font-sans transition-all duration-150
												{!day.available ? 'text-(--color-stone)/30 cursor-not-allowed' : ''}
												{day.available && selectedDate !== day.date ? 'hover:bg-(--color-forest)/10 text-(--color-charcoal)' : ''}
												{selectedDate === day.date ? 'bg-(--color-forest) text-white' : ''}"
										>
											{day.label}
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>

					<!-- Time slots -->
					{#if selectedDate}
						<div>
							<h3 class="font-serif text-lg text-(--color-charcoal) mb-4">
								Créneaux disponibles · {formatDateFR(selectedDate)}
							</h3>
							{#if loadingSlots}
								<div class="flex items-center gap-3 text-(--color-stone) py-4">
									<div class="w-4 h-4 border-2 border-(--color-forest)/30 border-t-(--color-forest) rounded-full animate-spin"></div>
									<span class="font-sans text-sm">Chargement des créneaux...</span>
								</div>
							{:else if slots.length === 0}
								<div class="bg-(--color-cream) rounded-sm border border-(--color-sand) p-6 text-center">
									<p class="font-sans text-sm text-(--color-stone)">Aucun créneau disponible ce jour. Choisissez une autre date.</p>
								</div>
							{:else}
								<div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
									{#each slots as slot}
										<button
											type="button"
											onclick={() => selectedSlot = slot}
											class="py-2.5 px-3 text-sm font-sans rounded-sm border transition-all duration-150
												{selectedSlot === slot
													? 'bg-(--color-forest) text-white border-(--color-forest)'
													: 'bg-white border-(--color-sand) text-(--color-charcoal) hover:border-(--color-forest)'}"
										>
											{slot}
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}

					<input type="hidden" name="serviceId" value={selectedServiceId} />
					<input type="hidden" name="date" value={selectedDate} />
					<input type="hidden" name="startTime" value={selectedSlot} />

					<div class="flex justify-between mt-8">
						<button type="button" onclick={() => step = 1} class="btn-ghost">← Retour</button>
						<button
							type="button"
							onclick={() => { if (selectedDate && selectedSlot) step = 3; }}
							disabled={!selectedDate || !selectedSlot}
							class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
						>
							Continuer →
						</button>
					</div>
				</div>
			{/if}

			<!-- STEP 3: Details + Confirm -->
			{#if step === 3}
				<div class="glass-panel rounded-(--radius-card) p-8">
					<!-- Recap -->
					<div class="bg-(--color-cream) rounded-sm border border-(--color-sand) p-5 mb-8">
						<p class="font-sans text-xs tracking-widest uppercase text-(--color-gold) mb-3">Récapitulatif</p>
						<div class="space-y-2 text-sm font-sans">
							<div class="flex justify-between">
								<span class="text-(--color-stone)">Soin</span>
								<span class="text-(--color-charcoal) font-medium">{selectedService?.name}</span>
							</div>
							{#if selectedOption}
								<div class="flex justify-between">
									<span class="text-(--color-stone)">Option</span>
									<span class="text-(--color-charcoal) font-medium">{selectedOption}</span>
								</div>
							{/if}
							<div class="flex justify-between">
								<span class="text-(--color-stone)">Date</span>
								<span class="text-(--color-charcoal) font-medium">{formatDateFR(selectedDate)}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-(--color-stone)">Heure</span>
								<span class="text-(--color-charcoal) font-medium">{selectedSlot}</span>
							</div>
							<div class="flex justify-between border-t border-(--color-sand) pt-2 mt-2">
								<span class="text-(--color-stone)">Prix</span>
								<span class="font-serif text-lg text-(--color-gold)">{selectedService?.price}€</span>
							</div>
						</div>
					</div>

					<h2 class="font-serif text-2xl text-(--color-charcoal) mb-6">Vos coordonnées</h2>

					{#if data.user}
						<div class="bg-(--color-forest)/5 rounded-sm border border-(--color-forest)/20 p-4 mb-6">
							<p class="font-sans text-sm text-(--color-charcoal)">
								Réservation pour <strong>{data.user.firstName} {data.user.lastName}</strong>
							</p>
						</div>
					{:else}
						<div class="space-y-4 mb-6">
							<div class="grid grid-cols-2 gap-4">
								<div>
									<label class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Nom complet *</label>
									<input name="guestName" type="text" required class="input-field" placeholder="Marie Dupont" />
								</div>
								<div>
									<label class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Téléphone</label>
									<input name="guestPhone" type="tel" class="input-field" placeholder="06 00 00 00 00" />
								</div>
							</div>
							<div>
								<label class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Email *</label>
								<input name="guestEmail" type="email" required class="input-field" placeholder="votre@email.fr" />
							</div>
						</div>
					{/if}

					<div>
						<label class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Notes (optionnel)</label>
						<textarea name="notes" rows="3" class="input-field resize-none" placeholder="Allergies, préférences particulières..."></textarea>
					</div>

					<input type="hidden" name="serviceId" value={selectedServiceId} />
					<input type="hidden" name="date" value={selectedDate} />
					<input type="hidden" name="startTime" value={selectedSlot} />
					<input type="hidden" name="option" value={selectedOption} />

					<div class="flex justify-between mt-8">
						<button type="button" onclick={() => step = 2} class="btn-ghost">← Retour</button>
						<button type="submit" class="btn-primary bg-(--color-gold) hover:bg-(--color-gold-dark) !border-0">
							Confirmer la réservation
						</button>
					</div>

					{#if !data.user}
						<p class="font-sans text-xs text-center text-(--color-stone)/60 mt-4">
							<a href="/connexion" class="text-(--color-gold) hover:underline">Connectez-vous</a> pour gérer vos rendez-vous facilement.
						</p>
					{/if}
				</div>
			{/if}
		</form>
	</div>
</div>
