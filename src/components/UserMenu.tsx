'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UserMenuProps {
	isAuthenticated: boolean;
}

export function UserMenu({ isAuthenticated }: UserMenuProps) {
	if (!isAuthenticated) {
		return (
			<Button variant="outline" size="sm" className="flex items-center gap-2" disabled>
				<Avatar className="h-6 w-6">
					<AvatarFallback>G</AvatarFallback>
				</Avatar>
				<span className="hidden sm:inline">Demo Mode</span>
			</Button>
		);
	}

	return (
		<Button variant="outline" size="sm" className="flex items-center gap-2" disabled>
			<Avatar className="h-6 w-6">
				<AvatarFallback>U</AvatarFallback>
			</Avatar>
			<span className="hidden sm:inline">Demo User</span>
		</Button>
	);
}

