<script lang="ts">
	import type { ActionData } from './$types';
	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Connexion — Thai Head Spa Ajaccio</title>
</svelte:head>

<div class="min-h-screen bg-[--color-cream] flex items-center justify-center px-4 pt-20">
	<div class="w-full max-w-md">
		<!-- Card -->
		<div class="bg-white rounded-[--radius-card] shadow-[--shadow-card] overflow-hidden">
			<!-- Header -->
			<div class="bg-[--color-forest] px-8 py-10 text-center">
				<a href="/" class="inline-block mb-4">
					<span class="font-serif text-2xl text-white">Thai Head Spa</span>
					<br />
					<span class="font-sans text-xs tracking-[0.3em] uppercase text-[--color-gold]">Ajaccio</span>
				</a>
				<h1 class="font-serif text-2xl text-white mt-2">Bienvenue</h1>
				<p class="font-sans text-sm text-white/60 mt-1">Connectez-vous à votre espace personnel</p>
			</div>

			<!-- Form -->
			<form method="POST" class="px-8 py-8 space-y-5">
				{#if form?.error}
					<div class="bg-red-50 border border-red-200 text-red-700 rounded-sm px-4 py-3 text-sm">
						{form.error}
					</div>
				{/if}

				<div>
					<label for="email" class="block font-sans text-xs tracking-wider uppercase text-[--color-stone] mb-2">Email</label>
					<input
						id="email"
						type="email"
						name="email"
						required
						autocomplete="email"
						class="input-field"
						placeholder="votre@email.fr"
					/>
				</div>

				<div>
					<label for="password" class="block font-sans text-xs tracking-wider uppercase text-[--color-stone] mb-2">Mot de passe</label>
					<input
						id="password"
						type="password"
						name="password"
						required
						autocomplete="current-password"
						class="input-field"
						placeholder="••••••••"
					/>
				</div>

				<button type="submit" class="btn-primary w-full justify-center py-3.5">
					Se connecter
				</button>

				<p class="text-center font-sans text-sm text-[--color-stone]">
					Pas encore de compte ?
					<a href="/inscription" class="text-[--color-gold] hover:underline">Créer un compte</a>
				</p>
			</form>
		</div>
	</div>
</div>
