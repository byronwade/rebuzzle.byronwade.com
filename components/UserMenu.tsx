'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SignInButton, SignOutButton } from "@clerk/nextjs";

interface UserMenuProps {
	isAuthenticated: boolean;
}

export function UserMenu({ isAuthenticated }: UserMenuProps) {
	if (!isAuthenticated) {
		return (
			<SignInButton mode="modal">
				<Button variant="outline" size="sm" className="flex items-center gap-2">
					<Avatar className="h-6 w-6">
						<AvatarFallback>G</AvatarFallback>
					</Avatar>
					<span className="hidden sm:inline">Sign In</span>
				</Button>
			</SignInButton>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="flex items-center gap-2">
					<Avatar className="h-6 w-6">
						<AvatarFallback>U</AvatarFallback>
					</Avatar>
					<span className="hidden sm:inline">Account</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<SignOutButton>
					<DropdownMenuItem>Sign Out</DropdownMenuItem>
				</SignOutButton>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

