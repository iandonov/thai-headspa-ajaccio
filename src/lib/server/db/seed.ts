import { db } from './index';
import { services, availability, cmsContent } from './schema';

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
	]).run();
}
