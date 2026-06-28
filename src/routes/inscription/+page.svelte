<script lang="ts">
	import type { ActionData } from './$types';
	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Créer un compte — Thai Head Spa Ajaccio</title>
</svelte:head>

<div class="relative bg-fixed-img min-h-screen flex items-center justify-center px-4 pt-24 pb-12" style="background-image: linear-gradient(rgba(26,51,41,0.72), rgba(26,51,41,0.80)), url('/images/bg-stones.jpg');">
	<div class="w-full max-w-md">
		<div class="glass-panel rounded-(--radius-card) overflow-hidden">
			<div class="glass-dark px-8 py-10 text-center">
				<a href="/" class="inline-block mb-4">
					<span class="font-serif text-2xl text-white">Thai Head Spa</span>
					<br />
					<span class="font-sans text-xs tracking-[0.3em] uppercase text-(--color-gold)">Ajaccio</span>
				</a>
				<h1 class="font-serif text-2xl text-white mt-2">Créer un compte</h1>
				<p class="font-sans text-sm text-white/60 mt-1">Rejoignez notre espace bien-être</p>
			</div>

			<form method="POST" class="px-8 py-8 space-y-5">
				{#if form?.error}
					<div class="bg-red-50 border border-red-200 text-red-700 rounded-sm px-4 py-3 text-sm">
						{form.error}
					</div>
				{/if}

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="firstName" class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Prénom *</label>
						<input id="firstName" type="text" name="firstName" required class="input-field" placeholder="Marie" />
					</div>
					<div>
						<label for="lastName" class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Nom *</label>
						<input id="lastName" type="text" name="lastName" required class="input-field" placeholder="Dupont" />
					</div>
				</div>

				<div>
					<label for="email" class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Email *</label>
					<input id="email" type="email" name="email" required autocomplete="email" class="input-field" placeholder="votre@email.fr" />
				</div>

				<div>
					<label for="phone" class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Téléphone *</label>
					<input id="phone" type="tel" name="phone" required autocomplete="tel" class="input-field" placeholder="06 00 00 00 00" />
				</div>

				<div>
					<label for="password" class="block font-sans text-xs tracking-wider uppercase text-(--color-stone) mb-2">Mot de passe *</label>
					<input id="password" type="password" name="password" required autocomplete="new-password" class="input-field" placeholder="8 caractères minimum" />
				</div>

				<button type="submit" class="btn-primary w-full justify-center py-3.5">
					Créer mon compte
				</button>

				<p class="text-center font-sans text-sm text-(--color-stone)">
					Déjà un compte ?
					<a href="/connexion" class="text-(--color-gold) hover:underline">Se connecter</a>
				</p>
			</form>
		</div>
	</div>
</div>
