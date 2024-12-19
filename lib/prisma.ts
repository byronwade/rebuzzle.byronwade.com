import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
	return new PrismaClient({
		log: [], // Disable Prisma logging
		errorFormat: "minimal",
	}).$extends({
		query: {
			async $allOperations({ operation, model, args, query }) {
				const MAX_RETRIES = 3;
				let retries = 0;

				while (retries < MAX_RETRIES) {
					try {
						return await query(args);
					} catch (error: unknown) {
						if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string" && error.message.includes('prepared statement "s0" already exists')) {
							retries++;
							await new Promise((resolve) => setTimeout(resolve, 100 * retries));
							continue;
						}
						throw error;
					}
				}
			},
		},
	});
};

declare global {
	var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
