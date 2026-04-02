import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error('DATABASE_URL is not set');
}

const prisma = globalThis.prisma ?? new PrismaClient({
	datasources: {
		db: {
			url: databaseUrl,
		},
	},
});

if (process.env.NODE_ENV !== 'production') {
	globalThis.prisma = prisma;
}

export default prisma;
