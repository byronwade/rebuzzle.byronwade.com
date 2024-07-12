import { InfoCircledIcon, GearIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useContext } from "react";
import GameContext from "@/context/GameContext";
// import Image from "next/image";

export default function Header() {
	const { attemptsLeft, countdown } = useContext(GameContext);

	return (
		<>
			<div className="relitive flex p-3 items-center justify-between mx-auto max-w-7xl px-6 lg:px-8">
				<div>
					<Link href="/" className="flex items-center space-x-4 font-bold text-2xl">
						{/* <Image src="/vercel.svg" alt="Logo" width={40} height={40} /> */}
						Rebuzzle
					</Link>
					<p className="text-xs text-gray-500">Daily rebus puzzle games</p>
				</div>
				<div className="hidden md:flex space-x-8 items-center font-bold">
					{/* <Link href="/" className="hover:underline">
						Home
					</Link>
					<Link href="/rebus" className="hover:underline">
						Play
					</Link> */}
					<div>
						<p>Next puzzle available in: {countdown}</p>
					</div>
					<div>
						<span className="p-2 bg-black rounded-full text-white">{attemptsLeft}</span>
					</div>
					<Link href="/rebus">
						<InfoCircledIcon className="w-7 h-7" />
					</Link>
					<Link href="/rebus">
						<GearIcon className="w-7 h-7" />
					</Link>
				</div>
			</div>
		</>
	);
}
