import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: ["error", "warn"],
		datasourceUrl: process.env.POSTGRES_PRISMA_URL,
		// Remove connection pooling as it's handled by the database provider
	}).$extends({
		query: {
			$allOperations({ operation, args, query }) {
				// Add query logging in development
				if (process.env.NODE_ENV === "development") {
					console.log(`[Prisma Query] ${operation}`, args);
				}
				return query(args);
			},
		},
	});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
