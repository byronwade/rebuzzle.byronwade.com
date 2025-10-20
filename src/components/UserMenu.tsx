'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from './AuthProvider';

type UserMenuProps = {
	isAuthenticated: boolean;
};

export function UserMenu({ isAuthenticated }: UserMenuProps) {
	const { user, isLoading } = useAuth();

	if (isLoading) {
		return (
			<Button variant="outline" size="sm" className="flex items-center gap-2" disabled>
				<Avatar className="h-6 w-6">
					<AvatarFallback>...</AvatarFallback>
				</Avatar>
				<span className="hidden sm:inline">Loading...</span>
			</Button>
		);
	}

	if (!isAuthenticated || !user) {
		return (
			<Button variant="outline" size="sm" className="flex items-center gap-2" disabled>
				<Avatar className="h-6 w-6">
					<AvatarFallback>G</AvatarFallback>
				</Avatar>
				<span className="hidden sm:inline">Guest</span>
			</Button>
		);
	}

	return (
		<Button variant="outline" size="sm" className="flex items-center gap-2" disabled>
			<Avatar className="h-6 w-6">
				<AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
			</Avatar>
			<span className="hidden sm:inline">{user.username}</span>
		</Button>
	);
}

