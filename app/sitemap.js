export default function sitemap() {
	return [
		{
			url: "https://rebuzzle.vercel.app",
			lastModified: new Date(),
			changeFrequency: "yearly",
			priority: 1,
		},
		{
			url: "https://rebuzzle.vercel.app/about",
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.8,
		},
		{
			url: "https://rebuzzle.vercel.app/blog",
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.5,
		},
		{
			url: "https://rebuzzle.vercel.app/rebus",
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 0.9,
		},
		{
			url: "https://rebuzzle.vercel.app/login",
			lastModified: new Date(),
			changeFrequency: "yearly",
			priority: 0.6,
		},
		{
			url: "https://rebuzzle.vercel.app/signup",
			lastModified: new Date(),
			changeFrequency: "yearly",
			priority: 0.6,
		},
		{
			url: "https://rebuzzle.vercel.app/contact",
			lastModified: new Date(),
			changeFrequency: "yearly",
			priority: 0.7,
		},
	];
}
