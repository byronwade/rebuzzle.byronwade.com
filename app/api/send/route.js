import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/sendEmail";

export async function POST(req) {
	const { emailType, ...props } = await req.json();

	try {
		const data = await sendEmail(emailType, props);
		return new NextResponse(JSON.stringify(data), { status: 200 });
	} catch (error) {
		return new NextResponse(JSON.stringify({ error: error.message }), { status: 400 });
	}
}
