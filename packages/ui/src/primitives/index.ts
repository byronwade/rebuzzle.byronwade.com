/**
 * UI Primitives
 *
 * Low-level UI components based on Radix UI primitives with Tailwind styling.
 * These components are platform-agnostic and work across web, desktop, and mobile.
 */

export { Avatar, AvatarImage, AvatarFallback } from "./avatar";
export { Badge, badgeVariants, type BadgeProps } from "./badge";
export { Button, buttonVariants, type ButtonProps } from "./button";
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./card";
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./dialog";
export { Input, type InputProps } from "./input";
export { Progress } from "./progress";
export { Separator } from "./separator";
export { Skeleton } from "./skeleton";
export { Textarea } from "./textarea";
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./tooltip";
