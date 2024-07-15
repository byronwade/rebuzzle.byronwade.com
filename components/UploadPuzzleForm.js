"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addDays, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import stringSimilarity from "string-similarity";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import CustomDialog from "@/components/ui/CustomDialog";

// Utility function to normalize strings
const normalizeString = (str) => {
	return str.toLowerCase().replace(/[^a-z0-9]/g, "");
};

// Utility function to generate an image hash
const generateImageHash = (file) => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const hash = crypto.createHash("sha256");
			hash.update(new Uint8Array(reader.result));
			resolve(hash.digest("hex"));
		};
		reader.onerror = reject;
		reader.readAsArrayBuffer(file);
	});
};

const puzzleSchema = z.object({
	puzzle_date: z.date({
		required_error: "Puzzle date is required",
	}),
	image: z.any().refine((file) => file && file.length > 0 && file[0]?.size <= 5 * 1024 * 1024, { message: "Image is required and must be less than 5MB" }),
	solution: z.string().nonempty({ message: "Solution is required" }),
	explanation: z.string().nonempty({ message: "Explanation is required" }),
});

export function UploadPuzzleForm() {
	const form = useForm({
		resolver: zodResolver(puzzleSchema),
		defaultValues: {
			puzzle_date: undefined,
			image: null,
			solution: "",
			explanation: "",
		},
	});

	const [loading, setLoading] = useState(false);
	const [imagePreview, setImagePreview] = useState(null);
	const [formError, setFormError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");
	const [showSuccessDialog, setShowSuccessDialog] = useState(false);

	useEffect(() => {
		const fetchPuzzles = async () => {
			const { data: puzzles, error } = await supabase.from("puzzles").select("puzzle_date").order("puzzle_date", { ascending: false }).limit(1);

			if (error) {
				console.error("Error fetching puzzles:", error);
			} else if (puzzles.length > 0) {
				const lastDate = parseISO(puzzles[0].puzzle_date);
				const nextDate = addDays(lastDate, 1);
				form.setValue("puzzle_date", nextDate);
			} else {
				const today = new Date();
				form.setValue("puzzle_date", today);
			}
		};

		fetchPuzzles();
	}, [form]);

	const handleUpload = async (values) => {
		setLoading(true);
		const { puzzle_date, image, solution, explanation } = values;

		try {
			const normalizedSolution = normalizeString(solution);

			const { data: existingPuzzles, error: fetchError } = await supabase.from("puzzles").select("puzzle_date, solution");

			if (fetchError) {
				throw new Error(fetchError.message);
			}

			const duplicateDate = existingPuzzles.some((puzzle) => puzzle.puzzle_date === puzzle_date.toISOString().split("T")[0]);
			const duplicateSolution = existingPuzzles.some((puzzle) => {
				const normalizedDbSolution = normalizeString(puzzle.solution);
				const similarity = stringSimilarity.compareTwoStrings(normalizedDbSolution, normalizedSolution);
				return similarity >= 0.8;
			});

			if (duplicateDate) {
				setFormError("A puzzle with the same date already exists. Please choose a different date.");
				setLoading(false);
				return;
			}

			if (duplicateSolution) {
				setFormError("A puzzle with a similar solution already exists. Please choose a different solution.");
				setLoading(false);
				return;
			}

			const imageHash = await generateImageHash(image[0]);
			const { data: existingImages, error: imageCheckError } = await supabase.from("puzzles").select("image_hash");

			if (imageCheckError) {
				throw new Error(imageCheckError.message);
			}

			if (existingImages.some((existingImage) => existingImage.image_hash === imageHash)) {
				throw new Error("An image with the same content already exists. Please use a different image.");
			}

			const year = puzzle_date.getFullYear();
			const month = String(puzzle_date.getMonth() + 1).padStart(2, "0");
			const uuid = uuidv4();
			const folderPath = `RebusPuzzleImages/${year}/${month}/${uuid}`;
			const { data: imageData, error: imageError } = await supabase.storage.from("Rebus").upload(`${folderPath}/${image[0].name}`, image[0]);

			if (imageError) {
				throw new Error(imageError.message);
			}

			const { data: publicURLData, error: publicURLError } = await supabase.storage.from("Rebus").getPublicUrl(imageData.path);

			if (publicURLError) {
				throw new Error(publicURLError.message);
			}

			const imageUrl = publicURLData.publicUrl;

			if (!imageUrl) {
				throw new Error("Failed to get image URL.");
			}

			const { data, error } = await supabase.from("puzzles").insert([
				{
					puzzle_date: puzzle_date.toISOString().split("T")[0],
					image_url: imageUrl,
					solution,
					explanation,
					image_hash: imageHash,
				},
			]);

			if (error) {
				throw new Error(error.message);
			}

			setSuccessMessage("Puzzle uploaded successfully!");
			setShowSuccessDialog(true);
			form.reset();
			setImagePreview(null);
			setFormError("");
		} catch (error) {
			if (error.message.includes("The resource already exists")) {
				setFormError("The resource already exists. This means that a similar puzzle or image already exists in the database.");
			} else {
				setFormError(error.message);
			}
		} finally {
			setLoading(false);
		}
	};

	const handleImageChange = (event) => {
		const file = event.target.files[0];
		if (file) {
			setImagePreview(URL.createObjectURL(file));
		} else {
			setImagePreview(null);
		}
		form.setValue("image", event.target.files);
	};

	const handleSuccessDialogClose = () => {
		setShowSuccessDialog(false);
		setSuccessMessage("");
	};

	return (
		<Card className="mx-auto max-w-md">
			<CardHeader>
				<CardTitle className="text-2xl">Upload New Puzzle</CardTitle>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleUpload)} className="space-y-8">
						<FormField
							control={form.control}
							name="puzzle_date"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Puzzle Date</FormLabel>
									<Popover>
										<PopoverTrigger asChild>
											<FormControl>
												<Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
													{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
													<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
												</Button>
											</FormControl>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
										</PopoverContent>
									</Popover>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="image"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Image</FormLabel>
									<FormControl>
										<Input type="file" accept="image/webp,image/jpeg,image/png" onChange={handleImageChange} />
									</FormControl>
									{imagePreview && <Image src={imagePreview} alt="Image Preview" width={1920} height={1020} className="mt-4 w-full h-auto" />}
									<FormMessage />
								</FormItem>
							)}
						/>
						{formError && (
							<FormMessage type="error" className="mt-4">
								{formError}
							</FormMessage>
						)}
						<FormField
							control={form.control}
							name="solution"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Solution</FormLabel>
									<Textarea {...field} placeholder="Enter solution..." rows={4} className="resize-none" />
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="explanation"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Explanation</FormLabel>
									<Textarea {...field} placeholder="Enter explanation..." rows={4} className="resize-none" />
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? "Uploading..." : "Upload Puzzle"}
						</Button>
						{successMessage && (
							<CustomDialog open={showSuccessDialog} onOpenChange={handleSuccessDialogClose}>
								<div className="p-4">
									<FormMessage type="success" className="text-green-700">
										{successMessage}
									</FormMessage>
								</div>
							</CustomDialog>
						)}
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
