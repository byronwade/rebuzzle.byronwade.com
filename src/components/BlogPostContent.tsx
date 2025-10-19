'use client'

import { useState, useEffect } from "react";
import { Button } from '@/components/ui/button'
import { trackEvent, analyticsEvents } from '@/lib/analytics'
import { LockIcon, Calendar, Clock, ArrowRight, ArrowLeft } from "lucide-react";
import { LoginPrompt } from "./LoginPrompt";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface BlogPostContentProps {
	post: {
		slug: string;
		date: string;
		title: string;
		puzzle: string;
		answer: string;
		explanation: string;
		content: string;
		publishedAt?: Date;
	};
}

export default function BlogPostContent({ post }: BlogPostContentProps) {
	const [isRevealed, setIsRevealed] = useState(false);
	const [isToday, setIsToday] = useState(false);
	const [isCompleted, setIsCompleted] = useState(false);

	useEffect(() => {
		// Check if this is today's puzzle
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const postDate = new Date(post.date);
		postDate.setHours(0, 0, 0, 0);
		const isCurrentPuzzle = today.getTime() === postDate.getTime();
		setIsToday(isCurrentPuzzle);

		// Check if today's puzzle is completed
		if (isCurrentPuzzle) {
			const completionHash = localStorage.getItem("gameCompletion");
			if (completionHash) {
				try {
					const decodedData = JSON.parse(atob(completionHash));
					const nextPlayTime = new Date(decodedData.nextPlayTime);
					if (nextPlayTime > new Date()) {
						setIsCompleted(true);
					}
				} catch (error) {
					console.error("Error checking completion state:", error);
				}
			}
		}

		trackEvent(analyticsEvents.BLOG_POST_VIEW, { slug: post.slug, title: post.title });
	}, [post.slug, post.title, post.date]);

	const handleRevealClick = () => {
		if (isToday && !isCompleted) {
			return;
		}
		setIsRevealed(true);
		trackEvent(analyticsEvents.BLOG_ANSWER_REVEALED, { slug: post.slug });
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-8">
			<div className="max-w-4xl mx-auto">
				{/* Back to Blog */}
				<div className="mb-8">
					<Link href="/blog" className="inline-flex items-center gap-2 px-4 py-2 text-purple-600 hover:text-purple-700 transition-colors duration-200">
						<ArrowLeft className="w-4 h-4" />
						<span>Back to Blog</span>
					</Link>
				</div>

				{/* Main Article */}
				<article className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
					{/* Header */}
					<div className="bg-purple-50 px-6 py-8 border-b border-purple-100">
						<div className="flex items-center justify-between mb-6">
							<div className="flex items-center gap-2 text-sm text-gray-600">
								<Calendar className="w-4 h-4" />
								<span>{formatDate(post.date)}</span>
							</div>
							{isToday && <div className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full">Today's Puzzle</div>}
						</div>
						<h1 className="text-4xl font-bold text-gray-800 mb-4">{post.title}</h1>
					</div>

					{/* Puzzle Section */}
					<div className="p-8">
						<div className="mb-8">
							<h2 className="text-2xl font-semibold text-gray-700 mb-6 flex items-center gap-3">
								<div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
									<span className="text-purple-600">🧩</span>
								</div>
								Today's Puzzle
							</h2>
							<div className="p-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-center mb-6">
								<div className="text-5xl font-bold text-purple-600 mb-4">{post.puzzle}</div>
								<p className="text-gray-500">What does this rebus represent?</p>
							</div>

							{/* Answer Section */}
							{!isRevealed ? (
								<div className="space-y-4">
									<Button onClick={handleRevealClick} className={cn("w-full h-14 rounded-xl font-semibold text-lg transition-all duration-200", isToday && !isCompleted ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 text-white shadow-sm hover:shadow-md")} disabled={isToday && !isCompleted}>
										{isToday && !isCompleted ? (
											<>
												<LockIcon className="w-5 h-5 mr-2" />
												Complete Today's Puzzle First
											</>
										) : (
											<>
												<span>Reveal Answer & Explanation</span>
												<ArrowRight className="w-5 h-5 ml-2" />
											</>
										)}
									</Button>
									{isToday && !isCompleted && (
										<div className="p-6 bg-amber-50 rounded-xl border border-amber-200">
											<p className="text-amber-700 flex items-center gap-2">
												<Clock className="w-5 h-5" />
												You need to complete today's puzzle before viewing its solution.
											</p>
										</div>
									)}
								</div>
							) : (
								<div className="space-y-6">
									<div className="p-6 bg-green-50 rounded-2xl border border-green-200">
										<h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-3">
											<div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
												<span className="text-green-600">✓</span>
											</div>
											Answer
										</h3>
										<p className="text-3xl font-bold text-green-600">{post.answer}</p>
									</div>
									<div className="p-6 bg-blue-50 rounded-2xl border border-blue-200">
										<h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-3">
											<div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
												<span className="text-blue-600">💡</span>
											</div>
											Explanation
										</h3>
										<p className="text-gray-700 leading-relaxed text-lg">{post.explanation}</p>
									</div>
								</div>
							)}
						</div>

						{/* Article Content */}
						<div className="border-t border-gray-200 pt-8">
							<div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
								{post.content.split("\n").map((paragraph, index) => (
									<p key={index} className="mb-6 last:mb-0">
										{paragraph}
									</p>
								))}
							</div>
						</div>

						{/* Call to Action */}
						<div className="mt-12 p-6 bg-purple-50 rounded-2xl border border-purple-200 text-center">
							<h3 className="text-xl font-semibold text-gray-800 mb-2">Ready for More Puzzles?</h3>
							<p className="text-gray-600 mb-4">Challenge yourself with today's rebus puzzle!</p>
							<Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors duration-200">
								<span>Play Today's Puzzle</span>
								<ArrowRight className="w-4 h-4" />
							</Link>
						</div>
					</div>
				</article>
			</div>
		</div>
	);
}

