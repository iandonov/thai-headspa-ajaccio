<script lang="ts">
	import { page } from '$app/stores';
	let { children } = $props();

	const navItems = [
		{ href: '/admin', label: 'Tableau de bord', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
		{ href: '/admin/reservations', label: 'Réservations', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
		{ href: '/admin/services', label: 'Soins & Tarifs', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
		{ href: '/admin/contenu', label: 'Contenu CMS', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
		{ href: '/admin/disponibilites', label: 'Disponibilités', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
	];

	function isActive(href: string) {
		if (href === '/admin') return $page.url.pathname === '/admin';
		return $page.url.pathname.startsWith(href);
	}
</script>

<div class="min-h-screen flex bg-(--color-cream)">
	<!-- Sidebar -->
	<aside class="w-64 bg-(--color-forest) flex-shrink-0 hidden lg:flex flex-col">
		<div class="p-6 border-b border-white/10">
			<a href="/" class="block">
				<p class="font-serif text-xl text-white">Thai Head Spa</p>
				<p class="font-sans text-xs tracking-[0.3em] uppercase text-(--color-gold) mt-0.5">Administration</p>
			</a>
		</div>
		<nav class="flex-1 p-4 space-y-1">
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

	<!-- Mobile top nav -->
	<div class="lg:hidden fixed top-0 left-0 right-0 z-50 bg-(--color-forest) px-4 py-3 flex items-center justify-between">
		<a href="/admin" class="font-serif text-white">Admin</a>
		<a href="/" class="font-sans text-xs text-white/60">Voir le site</a>
	</div>

	<!-- Main content -->
	<main class="flex-1 overflow-auto pt-0 lg:pt-0">
		<div class="max-w-6xl mx-auto px-6 py-8 lg:py-10 mt-12 lg:mt-0">
			{@render children()}
		</div>
	</main>
</div>
