<svelte:head>
	<title>À Propos — Thai Head Spa Ajaccio</title>
</svelte:head>

<div class="relative bg-[--color-forest] pt-32 pb-20 overflow-hidden">
	<div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(ellipse at 50% 100%, #c9a96e 0%, transparent 60%);"></div>
	<div class="relative max-w-4xl mx-auto px-6 text-center">
		<p class="section-subheading text-[--color-gold]">Notre Histoire</p>
		<h1 class="font-serif text-5xl md:text-6xl text-white leading-tight">À Propos</h1>
	</div>
</div>

<div class="bg-[--color-warm-white] py-20">
	<div class="max-w-4xl mx-auto px-6">
		<!-- Intro -->
		<div class="text-center mb-16">
			<p class="section-subheading">Notre philosophie</p>
			<h2 class="section-heading mb-6">L'Art du Soin Thaïlandais<br/>au Cœur d'Ajaccio</h2>
			<div class="flex items-center justify-center gap-4 mb-8">
				<div class="h-px w-16 bg-[--color-sand]"></div>
				<span class="text-[--color-gold]">✦</span>
				<div class="h-px w-16 bg-[--color-sand]"></div>
			</div>
		</div>

		<div class="prose max-w-none space-y-6 text-[--color-stone] font-sans text-base leading-relaxed">
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

		<!-- Values -->
		<div class="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
			{#each [
				{ icon: '✿', title: 'Authenticité', desc: 'Des techniques thaïlandaises transmises de génération en génération, pratiquées dans leur forme la plus pure.' },
				{ icon: '◈', title: 'Personnalisation', desc: 'Chaque soin est adapté à vos besoins spécifiques pour une expérience unique et sur-mesure.' },
				{ icon: '◉', title: 'Bienveillance', desc: 'Un accueil chaleureux dans un espace dédié à votre sérénité, loin du tumulte du quotidien.' },
			] as v}
				<div class="text-center p-8 bg-[--color-cream] rounded-[--radius-card] border border-[--color-sand]/50">
					<div class="w-14 h-14 border border-[--color-gold] rounded-full flex items-center justify-center mx-auto mb-5">
						<span class="text-[--color-gold] text-xl">{v.icon}</span>
					</div>
					<h3 class="font-serif text-xl text-[--color-charcoal] mb-3">{v.title}</h3>
					<p class="font-sans text-sm text-[--color-stone] leading-relaxed">{v.desc}</p>
				</div>
			{/each}
		</div>

		<!-- CTA -->
		<div class="mt-16 text-center">
			<a href="/reservation" class="btn-primary">Prendre Rendez-vous</a>
		</div>
	</div>
</div>
