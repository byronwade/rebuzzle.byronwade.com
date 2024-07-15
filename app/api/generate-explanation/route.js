// pages/api/generate-explanation.js
import OpenAI from "openai";
import { NextResponse } from "next/server";

// Initialize OpenAI
const openai = new OpenAI({
	apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, // Ensure your API key is set correctly
});

export async function POST(request) {
	try {
		console.log("POST request received");

		// Parse incoming JSON request body
		const { imageUrl } = await request.json();

		if (!imageUrl) {
			throw new Error("Image URL is missing in the request body");
		}

		const response = await openai.chat.completions.create({
			model: "gpt-4o",
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: "Explain the rebus puzzle in one sentence based on the provided image" },
						{
							type: "image_url",
							image_url: {
								url: imageUrl,
							},
						},
					],
				},
			],
		});

		console.log("OpenAI response:", response.choices[0].message.content);

		const explanation = response.choices[0].message.content;

		return NextResponse.json({ explanation }, { status: 200 });
	} catch (error) {
		console.error("Error processing POST request:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
