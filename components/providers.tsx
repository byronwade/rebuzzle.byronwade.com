"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { unstable_cache } from 'next/cache'

interface QueryProviderProps {
	children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 24 * 60 * 60 * 1000, // 24 hours
						gcTime: 48 * 60 * 60 * 1000, // 48 hours
						refetchOnWindowFocus: false,
						refetchOnMount: false,
						retry: 1,
					},
				},
			})
	);

	return <QueryClientProvider client={queryClient}>{children}<ReactQueryDevtools initialIsOpen={false} /></QueryClientProvider>;
}

// Cache helper for server components
export const cache = <T,>(fn: () => Promise<T>) =>
	unstable_cache(
		fn,
		[],
		{
			revalidate: 3600, // 1 hour
			tags: ['global-cache'],
		}
	);
