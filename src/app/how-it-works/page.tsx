import {
  BarChart3,
  Brain,
  Cloud,
  Code,
  Database,
  ExternalLink,
  Github,
  Lightbulb,
  Puzzle,
  Search,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Twitter,
  Users,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { generateStaticPageMetadata } from "@/lib/seo/metadata";
import {
  generateCourseSchema,
  generateSpeakableSchema,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = generateStaticPageMetadata({
  title: "How It Works | Rebuzzle - AI-Powered Puzzle Generation",
  description:
    "Discover how Rebuzzle's intelligent AI system creates unique, challenging puzzles using chain-of-thought reasoning, multi-agent orchestration, quality assurance, and machine learning. Learn about our advanced puzzle generation technology.",
  url: "/how-it-works",
  keywords: [
    "AI puzzle generation",
    "machine learning puzzles",
    "intelligent puzzle system",
    "semantic search",
    "personalized recommendations",
    "puzzle learning",
    "adaptive difficulty",
    "vector embeddings",
    "quality assurance",
    "multi-agent AI",
  ],
});

export default function HowItWorksPage() {
  // Generate Course schema for educational content
  const courseSchema = generateCourseSchema({
    name: "Rebuzzle Puzzle Solving Course",
    description:
      "Learn how Rebuzzle's AI system generates puzzles and master techniques for solving rebus puzzles, logic grids, cryptic crosswords, and more.",
    educationalLevel: "Beginner to Advanced",
    teaches: [
      "Rebus puzzle solving techniques",
      "Logic grid deduction",
      "Cryptic crossword clue interpretation",
      "Pattern recognition strategies",
      "Number sequence analysis",
      "Caesar cipher decryption",
      "Trivia knowledge application",
    ],
    coursePrerequisites: [
      "Basic reading comprehension",
      "Elementary math skills",
    ],
  });

  // Generate Speakable schema for voice search
  const speakableSchema = generateSpeakableSchema({
    cssSelector: ["h1", "h2", "h3", ".card-title", ".card-description"],
  });

  const puzzleTypes = [
    {
      id: "rebus",
      name: "Rebus Puzzles",
      desc: "Visual word puzzles with emojis and symbols",
    },
    {
      id: "word-puzzle",
      name: "Word Puzzles",
      desc: "Anagrams, word searches, and more",
    },
    {
      id: "riddle",
      name: "Riddles",
      desc: "Lateral thinking and wordplay puzzles",
    },
    {
      id: "logic-grid",
      name: "Logic Grids",
      desc: "Einstein-style deductive reasoning",
    },
    {
      id: "number-sequence",
      name: "Number Sequences",
      desc: "Mathematical pattern recognition",
    },
    {
      id: "pattern-recognition",
      name: "Pattern Recognition",
      desc: "Visual pattern identification",
    },
    {
      id: "caesar-cipher",
      name: "Caesar Ciphers",
      desc: "Cryptographic code-breaking",
    },
    {
      id: "cryptic-crossword",
      name: "Cryptic Crosswords",
      desc: "Advanced crossword puzzles",
    },
    {
      id: "trivia",
      name: "Trivia",
      desc: "Knowledge-based challenge questions",
    },
    {
      id: "word-ladder",
      name: "Word Ladders",
      desc: "Transform words step by step",
    },
  ];

  return (
    <Layout>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(courseSchema),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(speakableSchema),
        }}
        type="application/ld+json"
      />
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex justify-center">
            <Brain className="h-12 w-12 text-purple-600" />
          </div>
          <h1 className="mb-4 font-semibold text-2xl md:text-3xl">
            How Our AI Creates Intelligent Puzzles
          </h1>
          <p className="mx-auto max-w-3xl text-muted-foreground text-sm leading-relaxed md:text-base">
            Rebuzzle uses a sophisticated multi-layered AI system that goes far
            beyond simple text generation. Our intelligent puzzle generation
            combines advanced reasoning, quality assurance, machine learning,
            and personalization to deliver unique, challenging puzzles tailored
            to each player.
          </p>
        </div>

        {/* Core Intelligence Features */}
        <section className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-purple-600" />
            <h2 className="font-semibold text-xl md:text-2xl">
              Core Intelligence Features
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  Chain-of-Thought Reasoning
                </CardTitle>
                <CardDescription>
                  The AI doesn't just generate puzzles randomly - it thinks
                  through each puzzle concept first
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Before creating a puzzle, our AI plans the visual strategy,
                  considers multiple layers of meaning, identifies challenge
                  elements, and creates the puzzle with full understanding. This
                  results in more thoughtful, creative, and well-structured
                  puzzles.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Multi-Agent Orchestration
                </CardTitle>
                <CardDescription>
                  Four specialized AI agents work together to create and refine
                  each puzzle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="ml-6 list-disc space-y-1 text-muted-foreground text-sm">
                  <li>
                    <strong>Puzzle Generator Agent:</strong> Creates the initial
                    puzzle
                  </li>
                  <li>
                    <strong>Quality Evaluator Agent:</strong> Reviews and scores
                    quality across 7 dimensions
                  </li>
                  <li>
                    <strong>Difficulty Calibrator Agent:</strong> Adjusts
                    difficulty accurately
                  </li>
                  <li>
                    <strong>Personalized Generator Agent:</strong> Customizes
                    puzzles for individual users
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  Quality Assurance Pipeline
                </CardTitle>
                <CardDescription>
                  Every puzzle goes through rigorous multi-dimensional quality
                  checks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-muted-foreground text-sm leading-relaxed">
                  Puzzles are evaluated across 7 dimensions: clarity,
                  creativity, solvability, appropriateness, visual appeal,
                  educational value, and fun factor. Only puzzles scoring above
                  our quality threshold are published, with automatic retry and
                  improvement up to 3 times.
                </p>
                <p className="font-medium text-muted-foreground text-sm">
                  Result: 85%+ publish rate with consistently high-quality
                  puzzles
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Uniqueness Guarantee
                </CardTitle>
                <CardDescription>
                  Advanced fingerprinting ensures no duplicate puzzles, even
                  semantically similar ones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Using semantic fingerprinting, component tracking, and
                  similarity scoring, we ensure every puzzle is truly unique.
                  Puzzles with more than 80% similarity to existing ones are
                  automatically rejected and the system generates a new
                  variation.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Learning & Adaptation */}
        <section className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-purple-600" />
            <h2 className="font-semibold text-xl md:text-2xl">
              Learning & Adaptation
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Puzzle Learning System
                </CardTitle>
                <CardDescription>
                  The system learns from user behavior to improve puzzle quality
                  over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="ml-6 list-disc space-y-2 text-muted-foreground text-sm">
                  <li>Analyzes solve rates, time to solve, and hints used</li>
                  <li>Calculates actual difficulty based on real user data</li>
                  <li>
                    Identifies problematic puzzles (too easy/hard/confusing)
                  </li>
                  <li>Auto-calibrates difficulty ratings for accuracy</li>
                  <li>Generates improvement suggestions for future puzzles</li>
                </ul>
                <p className="mt-3 font-medium text-muted-foreground text-sm">
                  Result: Difficulty ratings become more accurate, and puzzle
                  quality continuously improves
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  User Profiling
                </CardTitle>
                <CardDescription>
                  Builds intelligent profiles for each player to personalize
                  their experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="ml-6 list-disc space-y-2 text-muted-foreground text-sm">
                  <li>
                    Estimates skill level (beginner/intermediate/advanced)
                  </li>
                  <li>
                    Calculates difficulty preferences based on performance
                  </li>
                  <li>Identifies favorite categories and puzzle types</li>
                  <li>Tracks solve rates, average time, and hint usage</li>
                  <li>Monitors engagement levels and improvement trends</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Personalization */}
        <section className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <Lightbulb className="h-6 w-6 text-purple-600" />
            <h2 className="font-semibold text-xl md:text-2xl">
              Personalization
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Personalized Recommendations
                </CardTitle>
                <CardDescription>
                  Multi-factor recommendation engine suggests puzzles tailored
                  to each player
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-muted-foreground text-sm leading-relaxed">
                  Our recommendation system combines multiple signals:
                </p>
                <ul className="ml-6 list-disc space-y-1 text-muted-foreground text-sm">
                  <li>
                    <strong>Semantic search:</strong> Finds puzzles similar to
                    ones you enjoyed
                  </li>
                  <li>
                    <strong>Category-based:</strong> Suggests puzzles in your
                    favorite categories
                  </li>
                  <li>
                    <strong>Difficulty-matched:</strong> Matches your current
                    skill level
                  </li>
                  <li>
                    <strong>Performance-based:</strong> Adjusts from your recent
                    performance
                  </li>
                </ul>
                <p className="mt-3 text-muted-foreground text-sm">
                  Recommendations improve as the system learns your preferences
                  and play patterns.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  Adaptive Difficulty
                </CardTitle>
                <CardDescription>
                  Automatically adjusts puzzle difficulty to keep you in your
                  "sweet spot"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-muted-foreground text-sm leading-relaxed">
                  The system adapts based on:
                </p>
                <ul className="ml-6 list-disc space-y-1 text-muted-foreground text-sm">
                  <li>Recent performance (solve rates)</li>
                  <li>Your preferred difficulty range</li>
                  <li>Skill level trends over time</li>
                  <li>Hint usage patterns</li>
                </ul>
                <p className="mt-3 font-medium text-muted-foreground text-sm">
                  Smart responses like: "You're solving puzzles quickly - try
                  something more challenging!" or "Let's try something a bit
                  easier to build confidence"
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Semantic Understanding */}
        <section className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <Search className="h-6 w-6 text-purple-600" />
            <h2 className="font-semibold text-xl md:text-2xl">
              Semantic Understanding
            </h2>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Vector Embeddings & Semantic Search
              </CardTitle>
              <CardDescription>
                The AI understands puzzle meaning, not just keywords
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-muted-foreground text-sm leading-relaxed">
                Every puzzle is converted into a mathematical vector (embedding)
                that represents its meaning. This allows the system to:
              </p>
              <ul className="ml-6 list-disc space-y-2 text-muted-foreground text-sm">
                <li>
                  Find semantically similar puzzles (by meaning, not just
                  keywords)
                </li>
                <li>
                  Search by concept (e.g., "find puzzles about cats" finds
                  cat-related puzzles even without the word "cat")
                </li>
                <li>Discover hidden relationships between puzzles</li>
                <li>
                  Provide more intelligent recommendations based on conceptual
                  similarity
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground text-sm">
                This is much more powerful than simple keyword matching - the
                system truly understands what puzzles are about.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Multi-Puzzle Types */}
        <section className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <Puzzle className="h-6 w-6 text-purple-600" />
            <h2 className="font-semibold text-xl md:text-2xl">
              10 Different Puzzle Types
            </h2>
          </div>
          <p className="mb-6 text-muted-foreground text-sm leading-relaxed">
            Our AI system generates 10 different puzzle types, each with
            specialized generation logic:
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {puzzleTypes.map((type) => (
              <Card key={type.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{type.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{type.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Advanced Features */}
        <section className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <Zap className="h-6 w-6 text-purple-600" />
            <h2 className="font-semibold text-xl md:text-2xl">
              Advanced Features
            </h2>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Multi-Stage Generation Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-muted-foreground text-sm leading-relaxed">
                  Every puzzle goes through 6 stages: (1) Chain-of-thought
                  generation, (2) Uniqueness validation, (3) Difficulty
                  calibration, (4) Quality assurance, (5) Adversarial testing,
                  and (6) Final validation. Quality is checked at each stage
                  with automatic improvements and retries.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Semantic Caching</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Caches AI responses based on semantic similarity, reducing
                  redundant API calls, speeding up responses, and saving costs.
                  The system serves similar queries from cache using
                  meaning-based matching.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Free-Tier First Strategy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Prioritizes free-tier AI models with cost-ordered fallbacks.
                  This ensures efficient operation while maintaining
                  high-quality puzzle generation. The system automatically uses
                  the most cost-effective available model.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* What to Expect */}
        <section className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <Target className="h-6 w-6 text-purple-600" />
            <h2 className="font-semibold text-xl md:text-2xl">
              What You Can Expect
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Immediate Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="ml-6 list-disc space-y-2 text-muted-foreground text-sm">
                  <li>
                    High-quality, unique puzzles that are well-structured and
                    appropriately challenging
                  </li>
                  <li>
                    Intelligent recommendations tailored to your preferences and
                    skill level
                  </li>
                  <li>
                    Learning system that adapts based on your behavior and
                    performance
                  </li>
                  <li>
                    Semantic understanding that finds puzzles by meaning, not
                    just keywords
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Over Time (As System Learns)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="ml-6 list-disc space-y-2 text-muted-foreground text-sm">
                  <li>
                    More accurate difficulty ratings as the system learns from
                    player performance
                  </li>
                  <li>
                    Improved puzzle quality through identification and fixing of
                    common issues
                  </li>
                  <li>
                    Smarter recommendations that learn your individual
                    preferences deeply
                  </li>
                  <li>
                    Adaptive challenges that automatically adjust to keep you
                    engaged
                  </li>
                  <li>Data-driven insights into what works and what doesn't</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Bottom Line */}
        <section className="mb-8 rounded-lg border bg-muted/50 p-6">
          <h3 className="mb-3 font-semibold text-lg">The Bottom Line</h3>
          <p className="mb-4 text-muted-foreground text-sm leading-relaxed">
            Rebuzzle's AI system is production-ready and enterprise-grade. It
            doesn't just generate text - it <strong>thinks</strong> through
            puzzle creation, <strong>learns</strong> from user behavior,
            <strong>adapts</strong> to individual preferences,{" "}
            <strong>validates</strong> quality at multiple levels,
            <strong>understands</strong> semantic relationships, and{" "}
            <strong>improves</strong> over time.
          </p>
          <p className="font-medium text-muted-foreground text-sm">
            Expect high-quality, unique, personalized puzzles that get better
            over time!
          </p>
        </section>

        {/* Built With Section */}
        <section className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <Code className="h-6 w-6 text-purple-600" />
            <h2 className="font-semibold text-xl md:text-2xl">Built With</h2>
          </div>
          <p className="mb-6 text-muted-foreground text-sm leading-relaxed">
            Rebuzzle is powered by cutting-edge technologies and tools. Here are
            the key platforms, frameworks, and SDKs that make our intelligent
            puzzle system possible.
          </p>

          {/* AI & Machine Learning */}
          <div className="mb-8">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-lg">
              <Brain className="h-5 w-5 text-purple-600" />
              AI & Machine Learning
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Vercel AI SDK</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-muted-foreground text-sm">
                    Core AI SDK for building AI-powered applications with
                    TypeScript and React
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://sdk.vercel.ai/docs"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Docs
                    </a>
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://github.com/vercel/ai"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Github className="h-3.5 w-3.5" />
                      GitHub
                    </a>
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://x.com/vercel"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      Twitter
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Vercel AI Gateway</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-muted-foreground text-sm">
                    Unified gateway for AI model providers with automatic
                    routing and cost optimization
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://vercel.com/blog/ai-gateway"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Website
                    </a>
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://x.com/vercel"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      Twitter
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">AI SDK Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-muted-foreground text-sm">
                    Advanced tools for multi-agent orchestration, semantic
                    caching, state management, and development
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://ai-sdk-tools.dev/"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Website
                    </a>
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://github.com/vercel/ai/tree/main/packages/ai-sdk-tools"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Github className="h-3.5 w-3.5" />
                      GitHub
                    </a>
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://x.com/ponusformidabilis"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      Twitter
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Infrastructure & Platform */}
          <div className="mb-8">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-lg">
              <Cloud className="h-5 w-5 text-purple-600" />
              Infrastructure & Platform
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Vercel</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-muted-foreground text-sm">
                    Deployment platform and hosting for modern web applications
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://vercel.com"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Website
                    </a>
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://x.com/vercel"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      Twitter
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Vercel Workflows</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-muted-foreground text-sm">
                    Automate development workflows directly within Vercel
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://vercel.com/docs/workflows"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Docs
                    </a>
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://x.com/vercel"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      Twitter
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Next.js</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-muted-foreground text-sm">
                    React framework for production with server components and
                    optimizations
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://nextjs.org"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Website
                    </a>
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://x.com/nextjs"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      Twitter
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">React</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-muted-foreground text-sm">
                    JavaScript library for building user interfaces
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://react.dev"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Website
                    </a>
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://x.com/reactjs"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      Twitter
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Database & Storage */}
          <div className="mb-8">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-lg">
              <Database className="h-5 w-5 text-purple-600" />
              Database & Storage
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">MongoDB</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-muted-foreground text-sm">
                    NoSQL database for storing puzzle data, user profiles, and
                    analytics
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://www.mongodb.com"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Website
                    </a>
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://x.com/MongoDB"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      Twitter
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Development Tools & Services */}
          <div className="mb-8">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-lg">
              <Code className="h-5 w-5 text-purple-600" />
              Development Tools & Services
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">TypeScript</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-muted-foreground text-sm">
                    Typed superset of JavaScript for better developer experience
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://www.typescriptlang.org"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Website
                    </a>
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://x.com/typescript"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      Twitter
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Tailwind CSS</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-muted-foreground text-sm">
                    Utility-first CSS framework for rapid UI development
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://tailwindcss.com"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Website
                    </a>
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://x.com/tailwindcss"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      Twitter
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Zod</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-muted-foreground text-sm">
                    TypeScript-first schema validation library
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://zod.dev"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Website
                    </a>
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://github.com/colinhacks/zod"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Github className="h-3.5 w-3.5" />
                      GitHub
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Resend</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-muted-foreground text-sm">
                    Email service for transactional and notification emails
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://resend.com"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Website
                    </a>
                    <a
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline"
                      href="https://x.com/resend"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      Twitter
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            className="text-purple-600 text-sm hover:text-purple-700"
            href="/"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </Layout>
  );
}
