'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LockIcon } from "lucide-react";
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
	}, [post.date]);

	const handleRevealClick = () => {
		if (isToday && !isCompleted) {
			return;
		}
		setIsRevealed(true);
		trackEvent(analyticsEvents.BLOG_ANSWER_REVEALED, { slug: post.slug });
	};

	return (
		<Card className="bg-white border border-gray-200 shadow-sm">
			<CardContent className="pt-6">
				<h2 className="text-3xl font-bold mb-1 text-gray-800">{post.title}</h2>
				<p className="text-sm text-gray-600 mb-4">{post.date}</p>
				<div className="mb-4">
					<h3 className="text-lg font-semibold mb-2 text-gray-700">Today's Puzzle:</h3>
					<p className="text-3xl font-bold text-purple-600">{post.puzzle}</p>
				</div>
				{!isRevealed ? (
					<>
						<Button onClick={handleRevealClick} variant="outline" className={cn("text-purple-600 border-purple-600 hover:bg-purple-50", isToday && !isCompleted && "opacity-50 cursor-not-allowed")} disabled={isToday && !isCompleted}>
							{isToday && !isCompleted ? (
								<>
									<LockIcon className="w-4 h-4 mr-2" />
									Complete Today's Puzzle First
								</>
							) : (
								"Reveal Answer and Explanation"
							)}
						</Button>
						{isToday && !isCompleted && <p className="text-sm text-gray-500 mt-2">You need to complete today's puzzle before viewing its solution.</p>}
					</>
				) : (
					<div className="space-y-4">
						<div>
							<h3 className="text-lg font-semibold mb-2 text-gray-700">Answer:</h3>
							<p className="text-2xl font-bold text-green-600">{post.answer}</p>
						</div>
						<div>
							<h3 className="text-lg font-semibold mb-2 text-gray-700">Explanation:</h3>
							<p className="text-gray-600">{post.explanation}</p>
						</div>
					</div>
				)}
				<div className="mt-6">
					<p className="text-gray-600 mb-4">{post.excerpt}</p>
					<Link href={`/blog/${post.slug}`}>
						<Button variant="outline" className="text-purple-600 border-purple-600 hover:bg-purple-50">
							Read Full Article
						</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}

