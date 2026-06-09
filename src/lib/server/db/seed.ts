import { db } from './index';
import { services, availability, cmsContent, closures, settings } from './schema';
import { eq } from 'drizzle-orm';
import { frenchHolidays } from '../availability';

export { frenchHolidays };

export async function seedDatabase() {
	const existingServices = db.select().from(services).all();
	if (existingServices.length > 0) return;

	db.insert(services).values([
		{
			slug: 'head-spa',
			name: 'Head Spa',
			description: "L'Art de la Détente et de la Stimulation capillaire",
			longDescription: "Notre signature Head Spa combine massage crânien profond et massage facial pour une expérience de détente totale. Améliore la circulation sanguine, réduit le stress et favorise un meilleur sommeil. Un soin holistique qui revitalise le cuir chevelu et apaise l'esprit.",
			duration: 75,
			price: 65,
			category: 'head-spa',
			imageUrl: '/images/head-spa.jpg',
			sortOrder: 1,
		},
		{
			slug: 'reflexologie',
			name: 'Réflexologie Pieds & Mains',
			description: 'Équilibre des énergies vitales par stimulation des points réflexes',
			longDescription: "La réflexologie stimule les points réflexes des pieds et des mains pour rééquilibrer les énergies vitales du corps et soulager les tensions. Une technique ancestrale aux bienfaits profonds sur l'ensemble de l'organisme.",
			duration: 30,
			price: 30,
			category: 'reflexologie',
			imageUrl: '/images/reflexologie.jpg',
			sortOrder: 2,
		},
		{
			slug: 'massage-facial',
			name: 'Massage Facial & Gua-Sha',
			description: 'Forfait combiné lifting naturel et éclat du teint',
			longDescription: "Ce forfait de 2 heures associe techniques de lifting et la méthode traditionnelle Gua-Sha pour un effet rajeunissant et lumineux. Le Gua-Sha améliore la circulation, réduit les tensions faciales et offre un teint naturellement éclatant.",
			duration: 120,
			price: 100,
			category: 'facial',
			imageUrl: '/images/massage-facial.jpg',
			sortOrder: 3,
		},
		{
			slug: 'massage-corps-30',
			name: 'Massage Corps — 30 min',
			description: 'Massage aux huiles essentielles ou huile thaïlandaise',
			longDescription: "Un massage express aux huiles essentielles soigneusement sélectionnées pour détendre rapidement les muscles et apaiser l'esprit. Idéal pour une pause bien-être dans votre journée.",
			duration: 30,
			price: 30,
			category: 'massage',
			imageUrl: '/images/massage-corps.jpg',
			sortOrder: 4,
		},
		{
			slug: 'massage-corps-60',
			name: 'Massage Corps — 1 heure',
			description: 'Massage aux huiles essentielles ou huile thaïlandaise',
			longDescription: "Un massage complet qui libère les tensions musculaires profondes grâce à des huiles essentielles ou à l'huile thaïlandaise traditionnelle. Favorise la détente totale du corps et de l'esprit.",
			duration: 60,
			price: 50,
			category: 'massage',
			imageUrl: '/images/massage-corps.jpg',
			sortOrder: 5,
		},
		{
			slug: 'massage-corps-120',
			name: 'Massage Corps — 2 heures',
			description: 'Massage aux huiles essentielles ou huile thaïlandaise',
			longDescription: "Notre massage corps signature de 2 heures pour une immersion totale dans la détente. Techniques profondes adaptées à vos besoins, huiles aromatiques et gestuelle traditionnelle thaïlandaise pour un état de bien-être absolu.",
			duration: 120,
			price: 100,
			category: 'massage',
			imageUrl: '/images/massage-corps.jpg',
			sortOrder: 6,
		},
	]).run();

	// Default availability: Tue–Sat 9h–18h
	db.insert(availability).values([
		{ dayOfWeek: 2, startTime: '09:00', endTime: '18:00' },
		{ dayOfWeek: 3, startTime: '09:00', endTime: '18:00' },
		{ dayOfWeek: 4, startTime: '09:00', endTime: '18:00' },
		{ dayOfWeek: 5, startTime: '09:00', endTime: '18:00' },
		{ dayOfWeek: 6, startTime: '09:00', endTime: '17:00' },
	]).run();

	db.insert(cmsContent).values([
		{ key: 'hero_title', value: 'Votre Sanctuaire de Bien-Être', type: 'text' },
		{ key: 'hero_subtitle', value: 'Thai Head Spa & Massage', type: 'text' },
		{ key: 'hero_tagline', value: 'Découvrez l\'art ancestral du soin capillaire thaïlandais au cœur d\'Ajaccio', type: 'text' },
		{ key: 'about_title', value: 'L\'Art du Soin Thaïlandais', type: 'text' },
		{ key: 'about_body', value: "Niché au cœur d'Ajaccio, notre studio de bien-être vous invite à une expérience de détente profonde inspirée des traditions thaïlandaises. Chaque soin est une invitation au voyage intérieur, une pause hors du temps dédiée à votre harmonie corps et esprit.\n\nNous combinons techniques ancestrales et approche personnalisée pour vous offrir des soins uniques : head spa revitalisant, massages aux huiles essentielles, réflexologie et soins du visage. Notre engagement : votre bien-être total.", type: 'text' },
		{ key: 'contact_address', value: '05 rue Comte Bacciochi, 20 000 Ajaccio', type: 'text' },
		{ key: 'contact_phone', value: '06 07 94 96 63', type: 'text' },
		{ key: 'contact_hours', value: 'Mardi – Vendredi : 9h–18h\nSamedi : 9h–17h\nSur rendez-vous uniquement', type: 'text' },
		{ key: 'contact_email', value: 'contact@thaiheadspa-ajaccio.fr', type: 'text' },
		{ key: 'closure_notice', value: 'Fermeture annuelle du 6 février au 3 mars inclus.', type: 'text' },
		{ key: 'formules_title', value: 'Des Formules Personnalisables', type: 'text' },
		{ key: 'formules_tagline', value: 'Des formules personnalisables selon vos envies grâce à nos options exclusives.', type: 'text' },
	]).run();
}

// Idempotent: inserts the signature "formules" (selectable packages) if absent.
// Runs separately from seedDatabase so it also applies to already-seeded databases.
export function seedPackages() {
	const existing = db.select().from(services).where(eq(services.category, 'formule')).all();
	if (existing.length > 0) return;

	const formules = [
		{
			slug: 'evasion-head-spa',
			name: 'Évasion Head Spa',
			description: 'Pour une détente absolue et une stimulation capillaire bienfaisante.',
			longDescription: "Notre signature en formule essentielle : un Head Spa complet alliant massage crânien profond et soin du cuir chevelu pour une parenthèse de pure sérénité.",
			duration: 75,
			price: 65,
			options: null,
			sortOrder: 10,
		},
		{
			slug: 'massage-personnalise',
			name: 'Massage Personnalisé',
			description: 'Massage au choix : visage, corps, pieds ou mains.',
			longDescription: "Composez votre massage sur mesure. Choisissez la zone et la technique qui vous correspondent parmi nos options exclusives.",
			duration: 60,
			price: 50,
			options: JSON.stringify(['Thaï-oil', 'Aromathérapie', 'Lifting', 'Gua-Sha', 'Réflexologie', 'Acupressure']),
			sortOrder: 11,
		},
		{
			slug: 'pause-express-pieds-mains',
			name: 'Pause Express Pieds & Mains',
			description: 'Massage des pieds et/ou des mains.',
			longDescription: "Une pause bien-être express ciblée sur les pieds et les mains, idéale pour relâcher les tensions et retrouver de la légèreté.",
			duration: 30,
			price: 30,
			options: JSON.stringify(['Réflexologie', 'Massage Thaï-oil']),
			sortOrder: 12,
		},
		{
			slug: 'head-spa-serenite-supreme',
			name: 'Head Spa — Sérénité Suprême',
			description: 'Head Spa + Massage Visage.',
			longDescription: "L'alliance du Head Spa et d'un massage du visage pour un effet tonifiant, anti-âge et un teint éclatant. Le summum de la détente.",
			duration: 120,
			price: 100,
			options: JSON.stringify(['Massage lifting — effet tonifiant & anti-âge', 'Massage Gau-Sha — pour une peau éclatante et détendue']),
			sortOrder: 13,
		},
		{
			slug: 'head-spa-harmonie-corporelle',
			name: 'Head Spa — Harmonie Corporelle',
			description: 'Head Spa + Massage Corporel.',
			longDescription: "Le Head Spa prolongé par un massage corporel complet pour apaiser le corps et l'esprit et rééquilibrer vos énergies.",
			duration: 120,
			price: 100,
			options: JSON.stringify(['Aromathérapie — pour apaiser corps et esprit', 'Massage Thaï-oil — rééquilibrage énergétique']),
			sortOrder: 14,
		},
		{
			slug: 'head-spa-vitalite-pieds-mains',
			name: 'Head Spa — Vitalité Pieds & Mains',
			description: 'Head Spa + Massage des pieds ou des mains.',
			longDescription: "Le Head Spa associé à un massage des pieds ou des mains, pour stimuler les zones réflexes et raviver votre vitalité.",
			duration: 120,
			price: 100,
			options: JSON.stringify(['Réflexologie — stimulation des zones réflexes', 'Massage Thaï-oil — détente & vitalité']),
			sortOrder: 15,
		},
		{
			slug: 'experience-complete',
			name: "L'Expérience Complète",
			description: 'Détente et soin global, au choix.',
			longDescription: "Notre expérience ultime de 3 heures : Head Spa, massage visage et massage corporel ou des pieds & mains, combinés pour une régénération totale.",
			duration: 180,
			price: 150,
			options: JSON.stringify(['Head Spa + Massage Visage + Massage corporel', 'Head Spa + Massage Visage + Massage des pieds ou des mains']),
			sortOrder: 16,
		},
	];

	db.insert(services).values(
		formules.map((f) => ({
			slug: f.slug,
			name: f.name,
			description: f.description,
			longDescription: f.longDescription,
			duration: f.duration,
			price: f.price,
			category: 'formule',
			options: f.options,
			imageUrl: null,
			active: true,
			sortOrder: f.sortOrder,
		}))
	).run();

	// Ensure formules CMS keys exist (so they are editable even on pre-existing DBs)
	const formuleContent = [
		{ key: 'formules_title', value: 'Des Formules Personnalisables', type: 'text' as const },
		{ key: 'formules_tagline', value: 'Des formules personnalisables selon vos envies grâce à nos options exclusives.', type: 'text' as const },
	];
	for (const c of formuleContent) {
		const exists = db.select().from(cmsContent).where(eq(cmsContent.key, c.key)).all();
		if (exists.length === 0) db.insert(cmsContent).values(c).run();
	}
}

// Spa-wide settings. total_beds = how many beds/tables can be in use at once.
export function seedSettings() {
	const exists = db.select().from(settings).where(eq(settings.key, 'total_beds')).all();
	if (exists.length === 0) {
		db.insert(settings).values({ key: 'total_beds', value: '3' }).run();
	}
}

// Seed the current year plus the next two as non-working public holidays.
// Idempotent: a date already present (manual closure or prior seed) is left as-is.
export function seedHolidays() {
	const thisYear = new Date().getFullYear();
	const rows = [thisYear, thisYear + 1, thisYear + 2].flatMap(frenchHolidays);
	for (const r of rows) {
		db.insert(closures)
			.values({ date: r.date, reason: r.reason, isHoliday: true })
			.onConflictDoNothing()
			.run();
	}
}
