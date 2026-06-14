<svelte:head>
	<title>À Propos — Thai Head Spa Ajaccio</title>
</svelte:head>

<!-- Fixed background image + translucent panels -->
<div class="relative bg-fixed-img min-h-screen" style="background-image: linear-gradient(rgba(26,51,41,0.78), rgba(26,51,41,0.84)), url('/images/bg-stones.jpg');">
	<!-- Page Hero -->
	<div class="pt-36 pb-10 px-6 text-center max-w-4xl mx-auto">
		<p class="section-subheading text-(--color-gold)">Notre Histoire</p>
		<h1 class="font-serif text-5xl md:text-6xl text-white leading-tight drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]">À Propos</h1>
	</div>

	<div class="pb-24">
		<div class="max-w-4xl mx-auto px-6">
			<!-- Intro + prose -->
			<div class="glass-panel rounded-(--radius-card) p-10 md:p-14">
				<div class="text-center mb-10">
					<p class="section-subheading">Notre philosophie</p>
					<h2 class="section-heading mb-6">L'Art du Soin Thaïlandais<br/>au Cœur d'Ajaccio</h2>
					<div class="flex items-center justify-center gap-4">
						<div class="h-px w-16 bg-(--color-sand)"></div>
						<span class="text-(--color-gold)">✦</span>
						<div class="h-px w-16 bg-(--color-sand)"></div>
					</div>
				</div>

				<div class="prose max-w-none space-y-6 text-(--color-stone) font-sans text-base leading-relaxed">
					<p>
						Niché au cœur d'Ajaccio, notre studio de bien-être vous invite à une expérience de détente profonde inspirée des traditions thaïlandaises millénaires. Chaque soin est une invitation au voyage intérieur, une pause hors du temps dédiée à votre harmonie corps et esprit.
					</p>
					<p>
						La médecine traditionnelle thaïlandaise considère le corps comme un tout — le bien-être physique, mental et émotionnel sont indissociables. C'est cette philosophie holistique que nous mettons au cœur de chaque prestation.
					</p>
					<p>
						Notre Head Spa signature combine massage crânien et techniques de stimulation capillaire pour revitaliser le cuir chevelu, améliorer la circulation sanguine et offrir une détente profonde. La réflexologie, art ancestral de la pression sur les points réflexes, permet de rééquilibrer les énergies vitales de l'organisme.
					</p>
					<p>
						Pour les soins du visage, nous utilisons la méthode traditionnelle Gua-Sha — une technique de raclage doux qui améliore la circulation, réduit les tensions faciales et offre un éclat naturel incomparable.
					</p>
				</div>
			</div>

			<!-- Values -->
			<div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
				{#each [
					{ icon: '✿', title: 'Authenticité', desc: 'Des techniques thaïlandaises transmises de génération en génération, pratiquées dans leur forme la plus pure.' },
					{ icon: '◈', title: 'Personnalisation', desc: 'Chaque soin est adapté à vos besoins spécifiques pour une expérience unique et sur-mesure.' },
					{ icon: '◉', title: 'Bienveillance', desc: 'Un accueil chaleureux dans un espace dédié à votre sérénité, loin du tumulte du quotidien.' },
				] as v}
					<div class="text-center p-8 glass-card rounded-(--radius-card)">
						<div class="w-14 h-14 border border-(--color-gold) rounded-full flex items-center justify-center mx-auto mb-5">
							<span class="text-(--color-gold) text-xl">{v.icon}</span>
						</div>
						<h3 class="font-serif text-xl text-(--color-charcoal) mb-3">{v.title}</h3>
						<p class="font-sans text-sm text-(--color-stone) leading-relaxed">{v.desc}</p>
					</div>
				{/each}
			</div>

			<!-- CTA -->
			<div class="mt-16 text-center">
				<a href="/services" class="inline-flex items-center gap-2 px-12 py-4 bg-(--color-gold) hover:bg-(--color-gold-dark) text-white font-sans text-sm tracking-widest uppercase rounded-sm transition-all duration-300 hover:shadow-lg">
					Prendre Rendez-vous
				</a>
			</div>
		</div>
	</div>
</div>
