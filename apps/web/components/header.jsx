import { InfoCircledIcon, GearIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
	return (
		<>
			<div className="relitive flex p-3 items-center justify-between mx-auto max-w-7xl px-6 lg:px-8">
				<Link href="/" className="flex items-center space-x-4">
					<Image src="/vercel.svg" alt="Logo" width={40} height={40} />
				</Link>
				<div className="hidden md:flex space-x-8 items-center font-bold">
					{/* <Link href="/" className="hover:underline">
						Home
					</Link>
					<Link href="/rebus" className="hover:underline">
						Play
					</Link> */}
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
