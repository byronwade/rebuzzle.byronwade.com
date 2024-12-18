'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { trackEvent, analyticsEvents } from '@/lib/analytics'
import { LockIcon } from "lucide-react";
import { LoginPrompt } from "./LoginPrompt";
import { cn } from "@/lib/utils";

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

	return (
		<Card className="bg-white border border-gray-200 shadow-sm">
			<CardContent className="pt-6">
				<h1 className="text-3xl font-bold mb-1 text-gray-800">{post.title}</h1>
				<p className="text-sm text-gray-600 mb-6">{post.date}</p>
				<div className="mb-6">
					<h3 className="text-xl font-semibold mb-2 text-gray-700">Today's Puzzle:</h3>
					<p className="text-3xl font-bold text-purple-600 mb-4">{post.puzzle}</p>
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
						<>
							<h3 className="text-xl font-semibold mb-2 text-gray-700">Answer:</h3>
							<p className="text-2xl font-bold text-green-600 mb-4">{post.answer}</p>
							<h3 className="text-xl font-semibold mb-2 text-gray-700">Explanation:</h3>
							<p className="mb-4 text-gray-600">{post.explanation}</p>
						</>
					)}
				</div>
				<div className="prose prose-sm max-w-none text-gray-700">
					{post.content.split("\n").map((paragraph, index) => (
						<p key={index} className="mb-4">
							{paragraph}
						</p>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

