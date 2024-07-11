import { createClient } from "@supabase/supabase-js";
import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const httpLink = createHttpLink({
	uri: GRAPHQL_ENDPOINT,
});

const authLink = setContext((_, { headers }) => {
	// get the authentication token from local storage if it exists
	const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
	// return the headers to the context so httpLink can read them
	return {
		headers: {
			...headers,
			authorization: token ? `Bearer ${token}` : "",
		},
	};
});

export const apolloClient = new ApolloClient({
	link: authLink.concat(httpLink),
	cache: new InMemoryCache(),
});
