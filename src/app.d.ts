declare global {
	namespace App {
		interface Locals {
			user: {
				id: number;
				email: string;
				firstName: string;
				lastName: string;
				role: string;
			} | null;
		}
	}
}

export {};
