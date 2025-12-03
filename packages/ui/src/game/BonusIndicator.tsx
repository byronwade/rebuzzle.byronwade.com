import { Sparkles, Zap } from "lucide-react";
import { cn } from "../utils/cn";

interface BonusIndicatorProps {
  type: "lucky" | "daily" | "streak-milestone";
  multiplier: number;
  className?: string;
}

export function BonusIndicator({ type, multiplier, className }: BonusIndicatorProps) {
  const configs = {
    lucky: {
      icon: Sparkles,
      label: "Lucky Solve!",
      bgClass: "bg-gradient-to-r from-purple-500 to-pink-500",
      textClass: "text-white",
      description: "Bonus points!",
    },
    daily: {
      icon: Zap,
      label: "Bonus Day!",
      bgClass: "bg-gradient-to-r from-amber-400 to-orange-500",
      textClass: "text-white",
      description: "Today's multiplier",
    },
    "streak-milestone": {
      icon: Sparkles,
      label: "Streak Bonus!",
      bgClass: "bg-gradient-to-r from-orange-500 to-red-500",
      textClass: "text-white",
      description: "Keep it going!",
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2",
        "animate-in zoom-in-50 duration-500",
        "shadow-lg",
        config.bgClass,
        config.textClass,
        className
      )}
    >
      <Icon className="h-5 w-5 animate-pulse" />
      <div className="flex flex-col items-start">
        <span className="font-bold text-sm">{config.label}</span>
        <span className="text-xs opacity-90">
          {multiplier}x {config.description}
        </span>
      </div>
    </div>
  );
}

export function BonusIndicatorCompact({ type, multiplier, className }: BonusIndicatorProps) {
  const configs = {
    lucky: {
      icon: Sparkles,
      color: "text-purple-500",
    },
    daily: {
      icon: Zap,
      color: "text-amber-500",
    },
    "streak-milestone": {
      icon: Sparkles,
      color: "text-orange-500",
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <span
      className={cn("inline-flex items-center gap-1 font-semibold", config.color, className)}
      title={`${multiplier}x bonus!`}
    >
      <Icon className="h-4 w-4" />
      <span>{multiplier}x</span>
    </span>
  );
}
