/**
 * Daily Puzzle Generator for Rebuzzle
 * Generates unique, creative rebus puzzles using emojis, words, phrases, and visual hints
 */

const fs = require("fs");
const path = require("path");

// Comprehensive puzzle templates and components
const PUZZLE_COMPONENTS = {
	// Emoji categories for visual hints
	emojis: {
		animals: ["🐱", "🐶", "🐻", "🦁", "🐸", "🐝", "🦋", "🐧", "🦅", "🐠", "🐙", "🦀", "🐍", "🦎", "🐢"],
		nature: ["🌳", "🌲", "🌴", "🌵", "🌾", "🌿", "🍀", "🌸", "🌺", "🌻", "🌹", "🌷", "🌼", "🌙", "⭐", "☀️", "🌈", "❄️", "⚡"],
		objects: ["📱", "💻", "⌚", "📷", "🎵", "🎨", "✂️", "🔑", "💡", "🔔", "📚", "✏️", "🎯", "🏀", "⚽", "🎸", "🎹"],
		food: ["🍎", "🍊", "🍌", "🍇", "🍓", "🥕", "🌽", "🍞", "🧀", "🥛", "☕", "🍯", "🍰", "🥧", "🍕", "🌮", "🍜"],
		transport: ["🚗", "🚕", "🚌", "🚲", "✈️", "🚁", "🚢", "🛸", "🚀", "🚂", "🚃", "🛴", "🛵", "🏍️"],
		symbols: ["❤️", "💙", "💚", "💜", "🖤", "🤍", "💎", "🔥", "💧", "🌟", "✨", "💫", "🎈", "🎀", "🎁", "🏆"],
		actions: ["🏃", "🚶", "🧘", "🤸", "🏊", "🚴", "🧗", "🤾", "🏋️", "🤹", "🎭", "🎪", "🎨", "🎵", "🎤", "🎬"],
	},

	// Word fragments and phonetic hints
	wordHints: {
		sounds: ["bee", "sea", "tea", "pea", "key", "knee", "eye", "why", "you", "two", "four", "eight"],
		prefixes: ["re", "un", "pre", "over", "under", "out", "up", "down", "in", "on", "off"],
		suffixes: ["ing", "ed", "er", "est", "ly", "tion", "ness", "ment", "ful", "less"],
		common: ["the", "and", "but", "for", "not", "with", "have", "this", "that", "from", "they", "know", "want", "been", "good", "much", "some", "time", "very", "when", "come", "here", "just", "like", "long", "make", "many", "over", "such", "take", "than", "them", "well", "were"],
	},

	// Visual representations and symbols
	visualHints: {
		directions: ["⬆️", "⬇️", "⬅️", "➡️", "↗️", "↘️", "↙️", "↖️", "🔄", "🔃", "🔂"],
		math: ["+", "-", "×", "÷", "=", "<", ">", "∞", "%", "#"],
		punctuation: [".", "!", "?", ",", ";", ":", '"', "'", "(", ")", "[", "]", "{", "}"],
		shapes: ["⭐", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🔺", "🔻", "🔶", "🔷", "🔸", "🔹"],
	},
};

// Answer categories with associated hint strategies
const ANSWER_CATEGORIES = {
	compound_words: [
		{ answer: "sunflower", hints: ["☀️", "🌻"], difficulty: 2, explanation: "Sun (☀️) + Flower (🌻) = Sunflower" },
		{ answer: "rainbow", hints: ["🌧️", "🎀"], difficulty: 2, explanation: "Rain (🌧️) + Bow (🎀) = Rainbow" },
		{ answer: "moonlight", hints: ["🌙", "💡"], difficulty: 3, explanation: "Moon (🌙) + Light (💡) = Moonlight" },
		{ answer: "snowman", hints: ["❄️", "👤"], difficulty: 2, explanation: "Snow (❄️) + Man (👤) = Snowman" },
		{ answer: "firefly", hints: ["🔥", "🦋"], difficulty: 3, explanation: "Fire (🔥) + Fly (🦋) = Firefly" },
		{ answer: "basketball", hints: ["🏀", "⚽"], difficulty: 3, explanation: "Basket (🏀) + Ball (⚽) = Basketball" },
		{ answer: "keyboard", hints: ["🔑", "📋"], difficulty: 3, explanation: "Key (🔑) + Board (📋) = Keyboard" },
		{ answer: "starfish", hints: ["⭐", "🐠"], difficulty: 4, explanation: "Star (⭐) + Fish (🐠) = Starfish" },
		{ answer: "bookworm", hints: ["📚", "🐛"], difficulty: 3, explanation: "Book (📚) + Worm (🐛) = Bookworm" },
		{ answer: "butterfly", hints: ["🧈", "🦋"], difficulty: 4, explanation: "Butter (🧈) + Fly (🦋) = Butterfly" },
	],

	phonetic_puzzles: [
		{ answer: "seaweed", hints: ["🌊", "weed"], difficulty: 3, explanation: "Sea (🌊) + Weed = Seaweed" },
		{ answer: "because", hints: ["🐝", "cause"], difficulty: 3, explanation: 'Bee (🐝) sounds like "Be" + Cause = Because' },
		{ answer: "believe", hints: ["🐝", "leaf", "🍃"], difficulty: 4, explanation: "Bee (🐝) + Leaf (🍃) + Eve = Believe" },
		{ answer: "before", hints: ["🐝", "4️⃣"], difficulty: 3, explanation: "Bee (🐝) + Four (4️⃣) = Before" },
		{ answer: "teacup", hints: ["🍵", "🏆"], difficulty: 2, explanation: "Tea (🍵) + Cup (🏆) = Teacup" },
		{ answer: "iceberg", hints: ["🧊", "⛰️"], difficulty: 3, explanation: "Ice (🧊) + Berg (⛰️) = Iceberg" },
		{ answer: "honeybee", hints: ["🍯", "🐝"], difficulty: 2, explanation: "Honey (🍯) + Bee (🐝) = Honeybee" },
		{ answer: "peacock", hints: ["🟢", "🐓"], difficulty: 4, explanation: "Pea (🟢) + Cock (🐓) = Peacock" },
	],

	phrase_puzzles: [
		{ answer: "piece of cake", hints: ["🧩", "of", "🍰"], difficulty: 4, explanation: "Piece (🧩) + of + Cake (🍰) = Piece of Cake (easy task)" },
		{ answer: "break the ice", hints: ["💔", "the", "🧊"], difficulty: 4, explanation: "Break (💔) + the + Ice (🧊) = Break the Ice" },
		{ answer: "time flies", hints: ["⏰", "🪰"], difficulty: 3, explanation: "Time (⏰) + Flies (🪰) = Time Flies" },
		{ answer: "heart attack", hints: ["❤️", "attack"], difficulty: 4, explanation: "Heart (❤️) + Attack = Heart Attack" },
		{ answer: "brain storm", hints: ["🧠", "⛈️"], difficulty: 3, explanation: "Brain (🧠) + Storm (⛈️) = Brainstorm" },
		{ answer: "eye candy", hints: ["👁️", "🍭"], difficulty: 3, explanation: "Eye (👁️) + Candy (🍭) = Eye Candy" },
		{ answer: "green thumb", hints: ["🟢", "👍"], difficulty: 4, explanation: "Green (🟢) + Thumb (👍) = Green Thumb" },
		{ answer: "cold shoulder", hints: ["🥶", "🤷"], difficulty: 4, explanation: "Cold (🥶) + Shoulder (🤷) = Cold Shoulder" },
	],

	creative_visual: [
		{ answer: "upside down", hints: ["⬆️", "side", "⬇️"], difficulty: 3, explanation: "Up (⬆️) + Side + Down (⬇️) = Upside Down" },
		{ answer: "inside out", hints: ["📦", "side", "📤"], difficulty: 3, explanation: "In (📦) + Side + Out (📤) = Inside Out" },
		{ answer: "crossroads", hints: ["❌", "🛣️"], difficulty: 4, explanation: "Cross (❌) + Roads (🛣️) = Crossroads" },
		{ answer: "waterfall", hints: ["💧", "fall"], difficulty: 3, explanation: "Water (💧) + Fall = Waterfall" },
		{ answer: "earthquake", hints: ["🌍", "quake"], difficulty: 3, explanation: "Earth (🌍) + Quake = Earthquake" },
		{ answer: "lighthouse", hints: ["💡", "🏠"], difficulty: 3, explanation: "Light (💡) + House (🏠) = Lighthouse" },
		{ answer: "spaceship", hints: ["🌌", "🚢"], difficulty: 3, explanation: "Space (🌌) + Ship (🚢) = Spaceship" },
		{ answer: "thunderbolt", hints: ["⚡", "🔩"], difficulty: 4, explanation: "Thunder (⚡) + Bolt (🔩) = Thunderbolt" },
	],

	modern_tech: [
		{ answer: "smartphone", hints: ["🧠", "📱"], difficulty: 3, explanation: "Smart (🧠) + Phone (📱) = Smartphone" },
		{ answer: "bluetooth", hints: ["🟦", "🦷"], difficulty: 4, explanation: "Blue (🟦) + Tooth (🦷) = Bluetooth" },
		{ answer: "facebook", hints: ["😀", "📖"], difficulty: 3, explanation: "Face (😀) + Book (📖) = Facebook" },
		{ answer: "instagram", hints: ["📸", "gram"], difficulty: 4, explanation: "Instant (📸) + Gram = Instagram" },
		{ answer: "youtube", hints: ["👤", "📺"], difficulty: 3, explanation: "You (👤) + Tube (📺) = YouTube" },
		{ answer: "podcast", hints: ["🎧", "cast"], difficulty: 3, explanation: "Pod (🎧) + Cast = Podcast" },
		{ answer: "website", hints: ["🕸️", "site"], difficulty: 3, explanation: "Web (🕸️) + Site = Website" },
		{ answer: "download", hints: ["⬇️", "load"], difficulty: 2, explanation: "Down (⬇️) + Load = Download" },
	],

	pop_culture: [
		{ answer: "superman", hints: ["💪", "👨"], difficulty: 2, explanation: "Super (💪) + Man (👨) = Superman" },
		{ answer: "spiderman", hints: ["🕷️", "👨"], difficulty: 2, explanation: "Spider (🕷️) + Man (👨) = Spiderman" },
		{ answer: "batman", hints: ["🦇", "👨"], difficulty: 2, explanation: "Bat (🦇) + Man (👨) = Batman" },
		{ answer: "wonderwoman", hints: ["❓", "👩"], difficulty: 3, explanation: "Wonder (❓) + Woman (👩) = Wonder Woman" },
		{ answer: "ironman", hints: ["⚙️", "👨"], difficulty: 2, explanation: "Iron (⚙️) + Man (👨) = Iron Man" },
		{ answer: "starwars", hints: ["⭐", "⚔️"], difficulty: 3, explanation: "Star (⭐) + Wars (⚔️) = Star Wars" },
		{ answer: "minecraft", hints: ["⛏️", "craft"], difficulty: 3, explanation: "Mine (⛏️) + Craft = Minecraft" },
		{ answer: "netflix", hints: ["🌐", "flix"], difficulty: 4, explanation: "Net (🌐) + Flix = Netflix" },
	],
};

// Difficulty scaling based on hint complexity
const DIFFICULTY_FACTORS = {
	emoji_only: 1.0,
	emoji_word_mix: 1.2,
	phonetic: 1.4,
	abstract_visual: 1.6,
	phrase_based: 1.8,
	cultural_reference: 1.5,
};

/**
 * Generate a seed based on date for consistent daily puzzles
 */
function generateDateSeed(date = new Date()) {
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	return year * 10000 + month * 100 + day;
}

/**
 * Seeded random number generator for consistent results
 */
class SeededRandom {
	constructor(seed) {
		this.seed = seed;
	}

	next() {
		this.seed = (this.seed * 9301 + 49297) % 233280;
		return this.seed / 233280;
	}

	choice(array) {
		return array[Math.floor(this.next() * array.length)];
	}

	shuffle(array) {
		const shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(this.next() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}
}

/**
 * Create enhanced visual hints for puzzles
 */
function enhanceHints(baseHints, category, rng) {
	const enhanced = [...baseHints];

	// Add visual separators for compound words
	if (category === "compound_words" && enhanced.length === 2) {
		enhanced.splice(1, 0, "+");
	}

	// Add directional hints for phrases
	if (category === "phrase_puzzles") {
		enhanced.push("➡️");
	}

	// Add emphasis for difficult puzzles
	if (category === "creative_visual") {
		enhanced.push("🤔");
	}

	return enhanced;
}

/**
 * Generate puzzle metadata including SEO and topic information
 */
function generateMetadata(answer, category, difficulty) {
	const topics = {
		compound_words: "Nature & Objects",
		phonetic_puzzles: "Wordplay & Sounds",
		phrase_puzzles: "Common Expressions",
		creative_visual: "Visual Concepts",
		modern_tech: "Technology",
		pop_culture: "Entertainment & Media",
	};

	const keywords = answer.split(/\s+/).concat(["rebus puzzle", "word game", "brain teaser", topics[category].toLowerCase()]);

	return {
		topic: topics[category],
		keyword: answer.replace(/\s+/g, ""),
		category: category.replace(/_/g, " "),
		relevanceScore: Math.max(1, 10 - difficulty),
		seoMetadata: {
			keywords,
			description: `Solve this ${topics[category].toLowerCase()} rebus puzzle: ${answer}`,
			ogTitle: `Rebuzzle: ${answer.charAt(0).toUpperCase() + answer.slice(1)} Puzzle`,
			ogDescription: `Challenge yourself with today's rebus puzzle featuring ${answer}. Can you decode the visual clues?`,
		},
	};
}

/**
 * Generate a single puzzle for a specific date
 */
function generatePuzzleForDate(date = new Date()) {
	const seed = generateDateSeed(date);
	const rng = new SeededRandom(seed);

	// Select category based on day of week for variety
	const categoryNames = Object.keys(ANSWER_CATEGORIES);
	const dayOfWeek = date.getDay();
	const selectedCategory = categoryNames[dayOfWeek % categoryNames.length];

	// Choose puzzle from selected category
	const categoryPuzzles = ANSWER_CATEGORIES[selectedCategory];
	const puzzle = rng.choice(categoryPuzzles);

	// Enhance hints with additional visual elements
	const enhancedHints = enhanceHints(puzzle.hints, selectedCategory, rng);

	// Generate comprehensive metadata
	const metadata = generateMetadata(puzzle.answer, selectedCategory, puzzle.difficulty);

	// Create the final puzzle object
	return {
		rebusPuzzle: enhancedHints.join(" "),
		difficulty: puzzle.difficulty,
		answer: puzzle.answer,
		explanation: puzzle.explanation,
		hints: [`Think about ${metadata.topic.toLowerCase()}`, `This is a ${puzzle.difficulty <= 2 ? "beginner" : puzzle.difficulty <= 3 ? "intermediate" : "advanced"} level puzzle`, `The answer is ${puzzle.answer.split(/\s+/).length > 1 ? "a phrase" : "a single word"}`],
		...metadata,
	};
}

/**
 * Generate puzzles for a range of days
 */
function generatePuzzleRange(startDate, days = 365) {
	const puzzles = [];
	const currentDate = new Date(startDate);

	for (let i = 0; i < days; i++) {
		const puzzle = generatePuzzleForDate(currentDate);
		puzzles.push({
			date: currentDate.toISOString().split("T")[0],
			...puzzle,
		});

		// Move to next day
		currentDate.setDate(currentDate.getDate() + 1);
	}

	return puzzles;
}

/**
 * Save puzzles to JSON file
 */
function savePuzzlesToFile(puzzles, filename = "public/puzzles.json") {
	const outputPath = path.join(process.cwd(), filename);

	// Ensure directory exists
	const dir = path.dirname(outputPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	// Save with proper formatting
	fs.writeFileSync(outputPath, JSON.stringify(puzzles, null, 2));
	console.log(`✅ Generated ${puzzles.length} puzzles saved to ${filename}`);
}

/**
 * Generate today's puzzle
 */
function generateTodaysPuzzle() {
	const today = new Date();
	const puzzle = generatePuzzleForDate(today);

	console.log("🎯 Today's Puzzle:");
	console.log(`Rebus: ${puzzle.rebusPuzzle}`);
	console.log(`Answer: ${puzzle.answer}`);
	console.log(`Difficulty: ${puzzle.difficulty}/5`);
	console.log(`Explanation: ${puzzle.explanation}`);
	console.log(`Category: ${puzzle.category}`);

	return puzzle;
}

/**
 * Main execution
 */
if (require.main === module) {
	const args = process.argv.slice(2);

	if (args.includes("--today")) {
		generateTodaysPuzzle();
	} else if (args.includes("--year")) {
		const startDate = new Date();
		const puzzles = generatePuzzleRange(startDate, 365);
		savePuzzlesToFile(puzzles);
	} else {
		// Generate 30 days of puzzles by default
		const startDate = new Date();
		const puzzles = generatePuzzleRange(startDate, 30);
		savePuzzlesToFile(puzzles);
	}
}

module.exports = {
	generatePuzzleForDate,
	generatePuzzleRange,
	generateTodaysPuzzle,
	savePuzzlesToFile,
	ANSWER_CATEGORIES,
	PUZZLE_COMPONENTS,
};
