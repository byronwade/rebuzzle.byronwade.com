import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
	size?: "sm" | "md" | "lg";
	className?: string;
	text?: string;
}

export function LoadingSpinner({ size = "md", className, text }: LoadingSpinnerProps) {
	const sizeClasses = {
		sm: "w-4 h-4",
		md: "w-8 h-8",
		lg: "w-12 h-12",
	};

	return (
		<div className={cn("flex flex-col items-center justify-center gap-3", className)}>
			<div className="relative">
				{/* Outer ring */}
				<div className={cn("border-4 border-gray-200 rounded-full animate-spin", sizeClasses[size])}>
					<div className={cn("border-4 border-purple-500 border-t-transparent rounded-full", sizeClasses[size])} />
				</div>

				{/* Inner pulsing dot */}
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
				</div>
			</div>

			{text && <p className="text-sm text-gray-600 animate-pulse">{text}</p>}
		</div>
	);
}
