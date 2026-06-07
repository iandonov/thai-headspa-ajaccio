<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	let { data, children } = $props();

	let mobileOpen = $state(false);
	let scrolled = $state(false);

	$effect(() => {
		const handler = () => { scrolled = window.scrollY > 50; };
		window.addEventListener('scroll', handler, { passive: true });
		return () => window.removeEventListener('scroll', handler);
	});

	const navLinks = [
		{ href: '/', label: 'Accueil' },
		{ href: '/services', label: 'Soins & Massages' },
		{ href: '/about', label: 'À Propos' },
		{ href: '/reservation', label: 'Réservation' },
		{ href: '/contact', label: 'Contact' },
	];

	function isActive(href: string) {
		if (href === '/') return $page.url.pathname === '/';
		return $page.url.pathname.startsWith(href);
	}
</script>

<div class="min-h-screen flex flex-col">
	<!-- Navigation -->
	<header
		class="fixed top-0 left-0 right-0 z-50 transition-all duration-500 {scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}"
	>
		<div class="max-w-7xl mx-auto px-6 flex items-center justify-between">
			<!-- Logo -->
			<a href="/" class="flex flex-col leading-none group">
				<span class="font-serif text-xl {scrolled ? 'text-[--color-forest]' : 'text-white'} transition-colors duration-300">Thai Head Spa</span>
				<span class="font-sans text-xs tracking-[0.3em] uppercase {scrolled ? 'text-[--color-gold]' : 'text-white/80'} transition-colors duration-300">Ajaccio</span>
			</a>

			<!-- Desktop Nav -->
			<nav class="hidden lg:flex items-center gap-8">
				{#each navLinks as link}
					<a
						href={link.href}
						class="font-sans text-sm tracking-wider transition-all duration-200
							{isActive(link.href)
								? (scrolled ? 'text-[--color-gold]' : 'text-[--color-gold]')
								: (scrolled ? 'text-[--color-charcoal] hover:text-[--color-gold]' : 'text-white/90 hover:text-white')}
						"
					>
						{link.label}
					</a>
				{/each}
			</nav>

			<!-- Auth + Book -->
			<div class="hidden lg:flex items-center gap-4">
				{#if data.user}
					<a href="/compte" class="font-sans text-sm {scrolled ? 'text-[--color-charcoal]' : 'text-white/90'} hover:text-[--color-gold] transition-colors">
						{data.user.firstName}
					</a>
				{:else}
					<a href="/connexion" class="font-sans text-sm {scrolled ? 'text-[--color-charcoal]' : 'text-white/90'} hover:text-[--color-gold] transition-colors tracking-wider">
						Connexion
					</a>
				{/if}
				<a href="/reservation" class="btn-primary text-xs py-2.5 px-6">
					Réserver
				</a>
			</div>

			<!-- Mobile Hamburger -->
			<button
				onclick={() => mobileOpen = !mobileOpen}
				class="lg:hidden flex flex-col gap-1.5 p-2"
				aria-label="Menu"
			>
				<span class="w-6 h-px {scrolled ? 'bg-[--color-charcoal]' : 'bg-white'} transition-all duration-300 {mobileOpen ? 'rotate-45 translate-y-2' : ''}"></span>
				<span class="w-6 h-px {scrolled ? 'bg-[--color-charcoal]' : 'bg-white'} transition-all duration-300 {mobileOpen ? 'opacity-0' : ''}"></span>
				<span class="w-6 h-px {scrolled ? 'bg-[--color-charcoal]' : 'bg-white'} transition-all duration-300 {mobileOpen ? '-rotate-45 -translate-y-2' : ''}"></span>
			</button>
		</div>

		<!-- Mobile Menu -->
		{#if mobileOpen}
			<div class="lg:hidden bg-white/98 backdrop-blur-md border-t border-[--color-sand] px-6 py-6 flex flex-col gap-4">
				{#each navLinks as link}
					<a
						href={link.href}
						onclick={() => mobileOpen = false}
						class="font-sans text-base py-2 border-b border-[--color-sand]/50
							{isActive(link.href) ? 'text-[--color-gold]' : 'text-[--color-charcoal]'}"
					>
						{link.label}
					</a>
				{/each}
				<div class="flex gap-4 pt-2">
					{#if data.user}
						<a href="/compte" onclick={() => mobileOpen = false} class="btn-ghost text-sm">Mon Compte</a>
					{:else}
						<a href="/connexion" onclick={() => mobileOpen = false} class="btn-ghost text-sm">Connexion</a>
						<a href="/inscription" onclick={() => mobileOpen = false} class="btn-outline text-xs">S'inscrire</a>
					{/if}
				</div>
			</div>
		{/if}
	</header>

	<!-- Page Content -->
	<main class="flex-1">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="bg-[--color-forest] text-white/80">
		<div class="max-w-7xl mx-auto px-6 py-16">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-12">
				<!-- Brand -->
				<div>
					<h3 class="font-serif text-2xl text-white mb-2">Thai Head Spa</h3>
					<p class="font-sans text-xs tracking-[0.3em] uppercase text-[--color-gold] mb-4">Ajaccio</p>
					<p class="text-sm leading-relaxed text-white/60 mb-6">
						L'art ancestral du soin thaïlandais au cœur de la Corse.
					</p>
					<a href="/reservation" class="btn-outline border-white/40 text-white/80 hover:bg-white/10 hover:border-white text-xs py-2 px-5">
						Prendre Rendez-vous
					</a>
				</div>

				<!-- Links -->
				<div>
					<h4 class="font-serif text-lg text-white mb-4">Navigation</h4>
					<ul class="space-y-2">
						{#each navLinks as link}
							<li>
								<a href={link.href} class="text-sm text-white/60 hover:text-[--color-gold] transition-colors">{link.label}</a>
							</li>
						{/each}
						{#if data.user?.role === 'admin'}
							<li><a href="/admin" class="text-sm text-[--color-gold]/70 hover:text-[--color-gold] transition-colors">Administration</a></li>
						{/if}
					</ul>
				</div>

				<!-- Contact -->
				<div>
					<h4 class="font-serif text-lg text-white mb-4">Contact</h4>
					<address class="not-italic space-y-3 text-sm text-white/60">
						<p>05 rue Comte Bacciochi<br />20 000 Ajaccio</p>
						<p>
							<a href="tel:+33607949663" class="hover:text-[--color-gold] transition-colors">06 07 94 96 63</a>
						</p>
						<p class="text-white/40 text-xs leading-relaxed">
							Mardi – Vendredi : 9h–18h<br />
							Samedi : 9h–17h<br />
							Sur rendez-vous uniquement
						</p>
					</address>
				</div>
			</div>

			<div class="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
				<p class="text-xs text-white/30">© 2024 Thai Head Spa Ajaccio. Tous droits réservés.</p>
				<div class="flex gap-6">
					<a href="/mentions-legales" class="text-xs text-white/30 hover:text-white/60 transition-colors">Mentions légales</a>
					<a href="/politique-confidentialite" class="text-xs text-white/30 hover:text-white/60 transition-colors">Confidentialité</a>
				</div>
			</div>
		</div>
	</footer>
</div>
