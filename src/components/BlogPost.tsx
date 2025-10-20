'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LockIcon, Calendar, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { trackEvent, analyticsEvents } from "@/lib/analytics";

interface BlogPostProps {
	post: {
		slug: string;
		date: string;
		title: string;
		puzzle: string;
		answer: string;
		explanation: string;
		excerpt: string;
		publishedAt?: Date;
	};
}

export default function BlogPost({ post }: BlogPostProps) {
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
		// This will be handled by the parent component or API
		if (isCurrentPuzzle) {
			// For now, assume not completed unless we have other data
			setIsCompleted(false);
		}
	}, [post.date]);

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
		<article className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300">
			{/* Header */}
			<div className="bg-purple-50 px-6 py-6 border-b border-purple-100">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2 text-sm text-gray-600">
						<Calendar className="w-4 h-4" />
						<span>{formatDate(post.date)}</span>
					</div>
					{isToday && <div className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full">Today's Puzzle</div>}
				</div>
				<h2 className="text-2xl font-bold text-gray-800 mb-2">{post.title}</h2>
				<p className="text-gray-600 leading-relaxed">{post.excerpt}</p>
			</div>

			{/* Puzzle Section */}
			<div className="p-6">
				<div className="mb-6">
					<h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
						<div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
							<span className="text-purple-600 text-sm">🧩</span>
						</div>
						Today's Puzzle
					</h3>
					<div className="p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-center">
						<div className="text-4xl font-bold text-purple-600 mb-4">{post.puzzle}</div>
						<p className="text-sm text-gray-500">What does this rebus represent?</p>
					</div>
				</div>

				{/* Answer Section */}
				{!isRevealed ? (
					<div className="space-y-4">
						<Button onClick={handleRevealClick} className={cn("w-full h-12 rounded-xl font-semibold transition-all duration-200", isToday && !isCompleted ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 text-white shadow-sm hover:shadow-md")} disabled={isToday && !isCompleted}>
							{isToday && !isCompleted ? (
								<>
									<LockIcon className="w-4 h-4 mr-2" />
									Complete Today's Puzzle First
								</>
							) : (
								<>
									<span>Reveal Answer & Explanation</span>
									<ArrowRight className="w-4 h-4 ml-2" />
								</>
							)}
						</Button>
						{isToday && !isCompleted && (
							<div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
								<p className="text-sm text-amber-700 flex items-center gap-2">
									<Clock className="w-4 h-4" />
									You need to complete today's puzzle before viewing its solution.
								</p>
							</div>
						)}
					</div>
				) : (
					<div className="space-y-6">
						<div className="p-6 bg-green-50 rounded-2xl border border-green-200">
							<h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
								<div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
									<span className="text-green-600 text-sm">✓</span>
								</div>
								Answer
							</h3>
							<p className="text-2xl font-bold text-green-600 mb-3">{post.answer}</p>
						</div>
						<div className="p-6 bg-blue-50 rounded-2xl border border-blue-200">
							<h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
								<div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
									<span className="text-blue-600 text-sm">💡</span>
								</div>
								Explanation
							</h3>
							<p className="text-gray-700 leading-relaxed">{post.explanation}</p>
						</div>
					</div>
				)}

				{/* Read More Button */}
				<div className="mt-8 pt-6 border-t border-gray-100">
					<Link href={`/blog/${post.slug}`} className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-purple-600 border border-purple-200 hover:border-purple-300 rounded-xl font-semibold transition-all duration-200 hover:shadow-sm">
						<span>Read Full Article</span>
						<ArrowRight className="w-4 h-4" />
					</Link>
				</div>
			</div>
		</article>
	);
}

