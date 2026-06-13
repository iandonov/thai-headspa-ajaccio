<script lang="ts">
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import { fade, slide } from 'svelte/transition';
	let { data, children } = $props();

	// The scroll lives inside <main>, not the window, so SvelteKit's scroll
	// restoration doesn't reset it. Scroll back to top on every navigation.
	let mainEl = $state<HTMLElement | null>(null);
	afterNavigate(() => mainEl?.scrollTo({ top: 0 }));

	type NavItem = {
		href: string;
		label: string;
		icon: string;
		children?: { href: string; label: string }[];
	};

	// Each category becomes a filter link on the services screen.
	const navItems: NavItem[] = $derived([
		{ href: '/admin', label: 'Tableau de bord', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
		{ href: '/admin/reservations', label: 'Réservations', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
		{ href: '/admin/clients', label: 'Clients', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 00-3-3.87' },
		{
			href: '/admin/services',
			label: 'Soins & Tarifs',
			icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
			children: [
				...data.categories.map((c: { slug: string; name: string }) => ({
					href: `/admin/services?categorie=${c.slug}`,
					label: c.name,
				})),
				{ href: '/admin/services/categories', label: 'Catégories' },
			],
		},
		{ href: '/admin/contenu', label: 'Gestion de contenu', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
		{ href: '/admin/disponibilites', label: 'Disponibilités', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
	]);

	function isActive(href: string) {
		if (href === '/admin') return $page.url.pathname === '/admin';
		if (href === '/admin/services') {
			// Highlight the parent only for the unfiltered list: a child link owns
			// the highlight when a category filter or the Catégories screen is active.
			return (
				$page.url.pathname.startsWith(href) &&
				!$page.url.pathname.startsWith('/admin/services/categories') &&
				!$page.url.searchParams.get('categorie')
			);
		}
		if (href.includes('?categorie=')) {
			const [path, query] = href.split('?');
			return (
				$page.url.pathname === path &&
				$page.url.searchParams.get('categorie') === new URLSearchParams(query).get('categorie')
			);
		}
		return $page.url.pathname.startsWith(href);
	}

	// Mobile navigation drawer state — closes on every navigation
	// (href, not pathname: category filters only change the query string).
	let mobileOpen = $state(false);
	$effect(() => {
		$page.url.href;
		mobileOpen = false;
	});

	// Soft-dismiss the drawer: Escape, or any scroll (capture phase catches the
	// scroll inside <main> too). A tap outside is handled by the backdrop below.
	$effect(() => {
		if (!mobileOpen) return;
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') mobileOpen = false; };
		const onScroll = () => { mobileOpen = false; };
		window.addEventListener('keydown', onKey);
		window.addEventListener('scroll', onScroll, { capture: true, passive: true });
		return () => {
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('scroll', onScroll, { capture: true });
		};
	});
</script>

<div class="h-screen flex bg-(--color-cream) overflow-hidden">
	<!-- Sidebar (desktop) -->
	<aside class="w-64 bg-(--color-forest) flex-shrink-0 hidden lg:flex flex-col">
		<div class="p-6 border-b border-white/10">
			<a href="/" class="block">
				<p class="font-serif text-xl text-white">Thai Head Spa</p>
				<p class="font-sans text-xs tracking-[0.3em] uppercase text-(--color-gold) mt-0.5">Administration</p>
			</a>
		</div>
		<nav class="flex-1 p-4 space-y-1 overflow-y-auto">
			{#each navItems as item}
				<a
					href={item.href}
					class="flex items-center gap-3 px-3 py-2.5 rounded-sm font-sans text-sm transition-all duration-150
						{isActive(item.href) ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white'}"
				>
					<svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={item.icon} />
					</svg>
					{item.label}
				</a>

				<!-- Submenu: always visible when the section has children -->
				{#if item.children}
					<div class="ml-7 mb-1 space-y-0.5 border-l border-white/10 pl-3">
						{#each item.children as sub}
							<a
								href={sub.href}
								class="block px-2 py-1.5 rounded-sm font-sans text-[13px] transition-all duration-150
									{isActive(sub.href) ? 'text-(--color-gold)' : 'text-white/50 hover:text-white'}"
							>
								{sub.label}
							</a>
						{/each}
					</div>
				{/if}
			{/each}
		</nav>
		<div class="p-4 border-t border-white/10">
			<a href="/" class="flex items-center gap-2 text-white/50 hover:text-white/80 text-xs font-sans transition-colors">
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
				</svg>
				Voir le site
			</a>
		</div>
	</aside>

	<!-- Mobile top bar + collapsible navigation -->
	<div class="lg:hidden fixed top-0 left-0 right-0 z-50 bg-(--color-forest)">
		<div class="px-4 py-3 flex items-center justify-between">
			<a href="/admin" class="font-serif text-white">Thai Head Spa <span class="font-sans text-[10px] tracking-[0.25em] uppercase text-(--color-gold) ml-1">Admin</span></a>
			<button
				type="button"
				onclick={() => (mobileOpen = !mobileOpen)}
				aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
				aria-expanded={mobileOpen}
				class="w-9 h-9 grid place-items-center rounded-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
			>
				{#if mobileOpen}
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
					</svg>
				{:else}
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				{/if}
			</button>
		</div>
		{#if mobileOpen}
			<nav transition:slide={{ duration: 220 }} class="px-4 pb-4 space-y-1 border-t border-white/10 pt-2 max-h-[70vh] overflow-y-auto">
				{#each navItems as item}
					<a
						href={item.href}
						class="flex items-center gap-3 px-3 py-2.5 rounded-sm font-sans text-sm
							{isActive(item.href) ? 'bg-white/15 text-white' : 'text-white/60'}"
					>
						<svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={item.icon} />
						</svg>
						{item.label}
					</a>
					{#if item.children}
						{#each item.children as sub}
							<a
								href={sub.href}
								class="block ml-10 px-3 py-2 rounded-sm font-sans text-[13px]
									{isActive(sub.href) ? 'text-(--color-gold)' : 'text-white/50'}"
							>
								{sub.label}
							</a>
						{/each}
					{/if}
				{/each}
				<a href="/" class="flex items-center gap-2 px-3 py-2.5 text-white/50 text-xs font-sans border-t border-white/10 mt-2 pt-3">
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
					Voir le site
				</a>
			</nav>
		{/if}
	</div>

	<!-- Click-away backdrop: below the top bar (z-40) so the bar and drawer stay
	     interactive; tapping the page softly dismisses the drawer. -->
	{#if mobileOpen}
		<button
			type="button"
			transition:fade={{ duration: 200 }}
			onclick={() => (mobileOpen = false)}
			aria-label="Fermer le menu"
			class="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
		></button>
	{/if}

	<!-- Main content -->
	<main bind:this={mainEl} class="flex-1 overflow-auto">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-10 mt-12 lg:mt-0">
			{@render children()}
		</div>
	</main>
</div>
