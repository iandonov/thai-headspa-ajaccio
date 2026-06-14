<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// The soin is always chosen on /services before reaching this page; capture
	// that preselection once. untrack makes the intentional one-time read of the
	// reactive `data` prop explicit (and silences the warning).
	let selectedServiceId = $state(untrack(() => data.preselectedServiceId ?? null));
	// All options start selected; URL params (from the services page) narrow them down.
	let selectedOptions = $state<string[]>(untrack(() => {
		if (data.preselectedOptions.length > 0) return data.preselectedOptions;
		const svc = data.services.find((s) => s.id === data.preselectedServiceId);
		return parseOptions(svc?.options ?? null);
	}));
	let selectedDate = $state('');
	let selectedSlot = $state('');
	let loadingSlots = $state(false);
	let slots = $state<{ time: string; available: boolean }[]>([]);
	let step = $state(1); // 1: date/slot, 2: details

	// Step 3 identity: how the visitor wants to provide their details.
	let authMode = $state<'guest' | 'login' | 'register'>('register');
	let authError = $state('');
	let authLoading = $state(false);

	// Shared enhance handler for the inline login/register forms: authenticate
	// without leaving the page, then refresh `data.user` so booking continues.
	function handleAuth() {
		authLoading = true;
		authError = '';
		return async ({ result }: { result: { type: string; data?: { authError?: string } } }) => {
			authLoading = false;
			if (result.type === 'success') {
				await invalidateAll();
			} else if (result.type === 'failure') {
				authError = result.data?.authError ?? 'Une erreur est survenue.';
			}
		};
	}

	const selectedService = $derived(data.services.find(s => s.id === selectedServiceId));

	// Admins are staff, not customers — booking is disabled for them.
	const isAdmin = $derived(data.user?.role === 'admin');

	function parseOptions(raw: string | null): string[] {
		if (!raw) return [];
		try {
			const v = JSON.parse(raw);
			return Array.isArray(v) ? (v as string[]) : [];
		} catch {
			return [];
		}
	}

	// Selectable options of the chosen service (the client can pick several chips).
	const serviceOptions = $derived(parseOptions(selectedService?.options ?? null));

	function toggleOption(opt: string) {
		selectedOptions = selectedOptions.includes(opt)
			? selectedOptions.filter((o) => o !== opt)
			: [...selectedOptions, opt];
	}

	// Compute min date (tomorrow), using local components to avoid UTC drift.
	const today = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
	const minDate = fmt(tomorrow);

	// Generate full calendar months (current + next 2) so each month grid is
	// complete. Past days and Sundays/Mondays are rendered but not selectable.
	const MONTHS_TO_SHOW = 5; // current month + 4 months ahead
	const calendarDays: { date: string; label: string; dayName: string; available: boolean }[] = [];
	for (let mi = 0; mi < MONTHS_TO_SHOW; mi++) {
		const first = new Date(today.getFullYear(), today.getMonth() + mi, 1);
		const year = first.getFullYear();
		const month = first.getMonth();
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		for (let d = 1; d <= daysInMonth; d++) {
			const date = new Date(year, month, d);
			const dateStr = fmt(date);
			const dow = date.getDay();
			calendarDays.push({
				date: dateStr,
				label: String(d),
				dayName: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
				available: dateStr >= minDate && dow !== 0 && dow !== 1,
			});
		}
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

	const monthKeys = $derived(Object.keys(months));
	let monthIndex = $state(0); // index of the first visible month

	// Show two months side by side when there's room, one when there isn't.
	let monthsPerView = $state(1);
	$effect(() => {
		const mq = window.matchMedia('(min-width: 640px)');
		const sync = () => {
			monthsPerView = mq.matches ? 2 : 1;
			// Keep the window in bounds when the view widens/narrows.
			monthIndex = Math.min(monthIndex, Math.max(0, monthKeys.length - monthsPerView));
		};
		sync();
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	});

	// Blank cells before day 1 so the month aligns to a Monday-first week
	// (Mon=0 … Sun=6). Built from local Y/M to avoid UTC parsing drift.
	function monthOffset(key: string): number {
		const [y, m] = key.split('-').map(Number);
		return (new Date(y, m - 1, 1).getDay() + 6) % 7;
	}
	function monthLabel(key: string): string {
		const [y, m] = key.split('-').map(Number);
		return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
	}

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

	// Change step and bring the wizard back into view — otherwise the new
	// step renders with the page still scrolled to wherever it was.
	function goToStep(n: number) {
		step = n;
		if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
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
		<div class="flex items-center justify-center pb-7 mb-8">
			{#each [
				{ n: 1, label: 'Créneau' },
				{ n: 2, label: 'Coordonnées' },
			] as s}
				<!-- Circle column is fixed width (label is absolute) so the
				     connector lines between circles are equally distributed. -->
				<div class="relative flex flex-col items-center">
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
					<span class="absolute top-full mt-2 whitespace-nowrap font-sans text-xs {step >= s.n ? 'text-white' : 'text-white/50'}">{s.label}</span>
				</div>
				{#if s.n < 2}
					<div class="w-16 h-px mx-3 {step > s.n ? 'bg-(--color-gold)' : 'bg-white/30'}"></div>
				{/if}
			{/each}
		</div>

		{#if form?.error}
			<div class="bg-red-50 border border-red-200 text-red-700 rounded-sm px-4 py-3 text-sm mb-6 text-center">
				{form.error}
			</div>
		{/if}

			<!-- STEP 1: Date + Slot -->
			{#if step === 1}
				<div class="glass-panel rounded-(--radius-card) p-6 sm:p-8">
					<!-- Selected service recap -->
					{#if selectedService}
						<div class="flex items-start gap-4 p-4 bg-(--color-forest)/5 rounded-sm border border-(--color-forest)/20 mb-8">
							<div class="flex-1">
								<p class="font-serif text-base text-(--color-charcoal)">{selectedService.name}</p>
								<p class="font-sans text-xs text-(--color-stone)">{formatDuration(selectedService.duration)} · {selectedService.price}€</p>
								{#if serviceOptions.length > 0}
									<p class="font-sans text-[0.65rem] tracking-widest uppercase text-(--color-gold)/80 mt-3 mb-1.5">Options au choix</p>
									<div class="flex flex-col gap-2">
										{#each serviceOptions as opt}
											{@const on = selectedOptions.includes(opt)}
											<button type="button" aria-pressed={on} onclick={() => toggleOption(opt)}
												class="flex items-center gap-2.5 text-left font-sans text-xs leading-snug px-3 py-2 rounded-lg border transition-all duration-150
													{on
														? 'bg-white border-(--color-forest)/30 text-(--color-charcoal)'
														: 'bg-transparent border-(--color-sand) text-(--color-stone) hover:border-(--color-forest)/40'}">
												<span class="shrink-0 w-4 h-4 rounded-md border flex items-center justify-center transition-colors
													{on ? 'bg-(--color-forest) border-(--color-forest) text-white' : 'border-(--color-stone)/40'}">
													{#if on}
														<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
													{/if}
												</span>
												<span>{opt}</span>
											</button>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<h2 class="font-serif text-2xl text-(--color-charcoal) mb-6">Choisissez une date</h2>

					<!-- One month panel -->
					{#snippet monthPanel(key: string)}
						<div>
							<p class="font-serif text-base text-(--color-charcoal) capitalize text-center mb-3">{monthLabel(key)}</p>
							<div class="grid grid-cols-7 gap-y-1">
								{#each ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'] as d}
									<div class="text-center font-sans text-[0.65rem] tracking-wider uppercase text-(--color-stone)/50 pb-2">{d}</div>
								{/each}
								{#each Array(monthOffset(key)) as _}
									<div></div>
								{/each}
								{#each months[key] ?? [] as day}
									<div class="flex justify-center">
										<button
											type="button"
											onclick={() => day.available && selectDate(day.date)}
											disabled={!day.available}
											class="w-9 h-9 flex items-center justify-center rounded-full text-sm font-sans transition-all duration-150
												{!day.available ? 'text-(--color-stone)/25 cursor-not-allowed' : ''}
												{day.available && selectedDate !== day.date ? 'text-(--color-charcoal) hover:bg-(--color-forest)/10' : ''}
												{selectedDate === day.date ? 'bg-(--color-forest) text-white font-medium shadow-sm' : ''}"
										>
											{day.label}
										</button>
									</div>
								{/each}
							</div>
						</div>
					{/snippet}

					<!-- Calendar: two months side by side when there's room, one otherwise -->
					<div class="mx-auto mb-8 bg-white rounded-(--radius-card) border border-(--color-sand) p-5 {monthsPerView === 2 ? 'max-w-xl' : 'max-w-sm'}">
						<div class="flex items-center justify-between mb-2">
							<button
								type="button"
								onclick={() => { if (monthIndex > 0) monthIndex--; }}
								disabled={monthIndex === 0}
								aria-label="Mois précédent{monthsPerView === 2 ? 's' : ''}"
								class="w-8 h-8 flex items-center justify-center rounded-full text-(--color-forest) hover:bg-(--color-forest)/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
							>
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
							</button>
							<button
								type="button"
								onclick={() => { if (monthIndex < monthKeys.length - monthsPerView) monthIndex++; }}
								disabled={monthIndex >= monthKeys.length - monthsPerView}
								aria-label="Mois suivant{monthsPerView === 2 ? 's' : ''}"
								class="w-8 h-8 flex items-center justify-center rounded-full text-(--color-forest) hover:bg-(--color-forest)/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
							>
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
							</button>
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
							{#if monthKeys[monthIndex]}{@render monthPanel(monthKeys[monthIndex])}{/if}
							{#if monthsPerView === 2 && monthKeys[monthIndex + 1]}{@render monthPanel(monthKeys[monthIndex + 1])}{/if}
						</div>
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
											onclick={() => { if (slot.available) selectedSlot = slot.time; }}
											disabled={!slot.available}
											title={slot.available ? '' : 'Créneau déjà réservé'}
											class="py-2.5 px-3 text-sm font-sans rounded-sm border transition-all duration-150
												{!slot.available
													? 'bg-(--color-cream) border-(--color-sand)/60 text-(--color-stone)/40 line-through cursor-not-allowed'
													: selectedSlot === slot.time
														? 'bg-(--color-forest) text-white border-(--color-forest)'
														: 'bg-white border-(--color-sand) text-(--color-charcoal) hover:border-(--color-forest)'}"
										>
											{slot.time}
										</button>
									{/each}
								</div>
								{#if !slots.some((s) => s.available)}
									<p class="font-sans text-xs text-(--color-stone) mt-3 text-center">Tous les créneaux de ce jour sont réservés. Choisissez une autre date.</p>
								{/if}
							{/if}
						</div>
					{/if}

					<div class="flex justify-between mt-8">
						<a href="/services" class="btn-ghost">← Changer de soin</a>
						<button
							type="button"
							onclick={() => { if (selectedDate && selectedSlot) goToStep(2); }}
							disabled={!selectedDate || !selectedSlot}
							class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
						>
							Continuer →
						</button>
					</div>
				</div>
			{/if}

			<!-- STEP 2: Details + Confirm -->
			{#if step === 2}
				<div class="glass-panel rounded-(--radius-card) p-6 sm:p-8">
					<!-- Recap -->
					<div class="bg-(--color-cream) rounded-sm border border-(--color-sand) p-5 mb-8">
						<p class="font-sans text-xs tracking-widest uppercase text-(--color-gold) mb-3">Récapitulatif</p>
						<div class="space-y-2 text-sm font-sans">
							<div class="flex justify-between">
								<span class="text-(--color-stone)">Soin</span>
								<span class="text-(--color-charcoal) font-medium">{selectedService?.name}</span>
							</div>
							{#if selectedOptions.length > 0}
								<div class="flex justify-between gap-4">
									<span class="text-(--color-stone) shrink-0">Option{selectedOptions.length > 1 ? 's' : ''}</span>
									<span class="text-(--color-charcoal) font-medium text-right">{selectedOptions.join(', ')}</span>
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

					{#if data.user && isAdmin}
						<!-- Admin accounts are staff — they cannot place bookings. -->
						<div class="flex items-center gap-3 bg-amber-50 rounded-sm border border-amber-200 p-4 mb-6">
							<svg class="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
							<p class="font-sans text-sm text-(--color-charcoal)">
								Vous êtes connecté en tant qu'<strong>administrateur</strong>. Les réservations ne sont pas disponibles pour les comptes administrateur — déconnectez-vous pour réserver en tant que client.
							</p>
						</div>
					{:else if data.user}
						<!-- Authenticated (incl. just signed in inline) -->
						<div class="flex items-center gap-3 bg-(--color-forest)/5 rounded-sm border border-(--color-forest)/20 p-4 mb-6">
							<div class="w-9 h-9 rounded-full bg-(--color-forest)/10 flex items-center justify-center text-(--color-forest) shrink-0">
								<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
							</div>
							<p class="font-sans text-sm text-(--color-charcoal)">
								Réservation pour <strong>{data.user.firstName} {data.user.lastName}</strong>
								<br /><span class="text-xs text-(--color-stone)">{data.user.email}</span>
							</p>
						</div>
					{:else}
						<!-- Identity chooser: guest / sign in / create account -->
						<div class="flex gap-1 p-1 bg-(--color-cream) rounded-sm border border-(--color-sand) mb-6">
							{#each [{ k: 'register', label: 'Créer un compte' }, { k: 'login', label: 'Connexion' }, { k: 'guest', label: 'Sans compte' }] as opt}
								<button
									type="button"
									onclick={() => { authMode = opt.k as typeof authMode; authError = ''; }}
									class="flex-1 py-2 px-2 text-xs font-sans tracking-wide rounded-sm transition-all duration-150
										{authMode === opt.k ? 'bg-white text-(--color-forest) shadow-sm font-medium' : 'text-(--color-stone) hover:text-(--color-charcoal)'}"
								>
									{opt.label}
								</button>
							{/each}
						</div>

						{#if authError}
							<div class="bg-red-50 border border-red-200 text-red-700 rounded-sm px-4 py-3 text-sm mb-4">
								{authError}
							</div>
						{/if}

						{#if authMode === 'login'}
							<!-- Inline sign-in: authenticates without leaving the page -->
							<form method="POST" action="?/login" use:enhance={handleAuth} class="space-y-4 mb-6">
								<div>
									<label for="login-email" class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Email *</label>
									<input id="login-email" name="email" type="email" required autocomplete="email" class="input-field" placeholder="votre@email.fr" />
								</div>
								<div>
									<label for="login-password" class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Mot de passe *</label>
									<input id="login-password" name="password" type="password" required autocomplete="current-password" class="input-field" placeholder="••••••••" />
								</div>
								<button type="submit" disabled={authLoading} class="btn-primary w-full justify-center disabled:opacity-50">
									{authLoading ? 'Connexion…' : 'Se connecter et continuer'}
								</button>
							</form>
						{:else if authMode === 'register'}
							<!-- Inline account creation -->
							<form method="POST" action="?/register" use:enhance={handleAuth} class="space-y-4 mb-6">
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label for="reg-firstName" class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Prénom *</label>
										<input id="reg-firstName" name="firstName" type="text" required class="input-field" placeholder="Marie" />
									</div>
									<div>
										<label for="reg-lastName" class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Nom *</label>
										<input id="reg-lastName" name="lastName" type="text" required class="input-field" placeholder="Dupont" />
									</div>
								</div>
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label for="reg-email" class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Email *</label>
										<input id="reg-email" name="email" type="email" required autocomplete="email" class="input-field" placeholder="votre@email.fr" />
									</div>
									<div>
										<label for="reg-phone" class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Téléphone</label>
										<input id="reg-phone" name="phone" type="tel" class="input-field" placeholder="06 00 00 00 00" />
									</div>
								</div>
								<div>
									<label for="reg-password" class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Mot de passe * <span class="normal-case text-(--color-stone)/60">(8 caractères min.)</span></label>
									<input id="reg-password" name="password" type="password" required autocomplete="new-password" class="input-field" placeholder="••••••••" />
								</div>
								<button type="submit" disabled={authLoading} class="btn-primary w-full justify-center disabled:opacity-50">
									{authLoading ? 'Création…' : 'Créer mon compte et continuer'}
								</button>
							</form>
						{/if}
					{/if}

					<!-- Booking confirmation form (guest fields included only when no account) -->
					<form method="POST" action="?/book">
						{#if !data.user && authMode === 'guest'}
							<div class="space-y-4 mb-6">
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label for="guest-name" class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Nom complet *</label>
										<input id="guest-name" name="guestName" type="text" required class="input-field" placeholder="Marie Dupont" />
									</div>
									<div>
										<label for="guest-phone" class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Téléphone</label>
										<input id="guest-phone" name="guestPhone" type="tel" class="input-field" placeholder="06 00 00 00 00" />
									</div>
								</div>
								<div>
									<label for="guest-email" class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Email *</label>
									<input id="guest-email" name="guestEmail" type="email" required class="input-field" placeholder="votre@email.fr" />
								</div>
							</div>
						{/if}

						{#if (data.user && !isAdmin) || authMode === 'guest'}
							<div>
								<label for="notes" class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Notes (optionnel)</label>
								<textarea id="notes" name="notes" rows="3" class="input-field resize-none" placeholder="Allergies, préférences particulières..."></textarea>
							</div>

							<input type="hidden" name="serviceId" value={selectedServiceId} />
							<input type="hidden" name="date" value={selectedDate} />
							<input type="hidden" name="startTime" value={selectedSlot} />
							<input type="hidden" name="option" value={selectedOptions.join(', ')} />

							<div class="flex justify-between mt-8">
								<button type="button" onclick={() => goToStep(1)} class="btn-ghost">← Retour</button>
								<button type="submit" class="btn-primary bg-(--color-gold) hover:bg-(--color-gold-dark) !border-0">
									Confirmer la réservation
								</button>
							</div>
						{:else}
							<div class="flex justify-start mt-8">
								<button type="button" onclick={() => goToStep(1)} class="btn-ghost">← Retour</button>
							</div>
						{/if}
					</form>
				</div>
			{/if}
	</div>
</div>
