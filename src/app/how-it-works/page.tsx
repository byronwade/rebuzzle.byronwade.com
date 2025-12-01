import type { Metadata } from "next";
import Link from "next/link";
import Layout from "@/components/Layout";
import { generateStaticPageMetadata } from "@/lib/seo/metadata";
import {
  generateCourseSchema,
  generateSpeakableSchema,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = generateStaticPageMetadata({
  title: "How It Works | Rebuzzle - AI-Powered Puzzle Generation",
  description:
    "A comprehensive technical overview of Rebuzzle's intelligent AI system for creating unique, challenging puzzles using chain-of-thought reasoning, multi-agent orchestration, quality assurance, and machine learning.",
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
    cssSelector: ["h1", "h2", "h3"],
  });

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
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-12">
        {/* Header */}
        <header className="mb-12">
          <h1 className="mb-4 font-semibold text-3xl leading-tight text-foreground md:text-4xl">
            How Rebuzzle Works
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            A technical overview of our AI-powered puzzle generation system
          </p>
        </header>

        {/* Introduction */}
        <div className="mb-12">
          <p className="text-foreground text-lg leading-relaxed md:text-xl">
            Rebuzzle employs a sophisticated multi-layered artificial intelligence system
            that generates unique, high-quality puzzles across ten distinct puzzle types.
            Our system combines chain-of-thought reasoning, multi-agent orchestration,
            semantic understanding, and continuous learning to create puzzles that are
            both challenging and solvable.
          </p>
        </div>

        {/* Section 1: System Architecture */}
        <section className="mb-16">
          <h2 className="mb-6 font-semibold text-2xl text-foreground md:text-3xl">
            System Architecture
          </h2>
          <p className="mb-6 text-foreground text-base leading-relaxed md:text-lg">
            Rebuzzle's architecture is built on a serverless, event-driven model that
            scales automatically to handle millions of puzzle requests. The system is
            designed with modularity, extensibility, and performance as core principles.
          </p>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Core Components
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            The system consists of several interconnected components:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              <strong>Puzzle Generation Engine:</strong> The core AI system that creates
              puzzles using large language models and specialized prompts
            </li>
            <li>
              <strong>Multi-Agent Orchestrator:</strong> Coordinates four specialized AI
              agents to generate, evaluate, calibrate, and personalize puzzles
            </li>
            <li>
              <strong>Quality Assurance Pipeline:</strong> Multi-dimensional evaluation
              system that scores puzzles across seven quality dimensions
            </li>
            <li>
              <strong>Semantic Search Engine:</strong> Vector-based similarity search using
              embeddings to find related puzzles and enable intelligent recommendations
            </li>
            <li>
              <strong>Learning System:</strong> Analyzes user behavior to improve puzzle
              quality and difficulty calibration over time
            </li>
            <li>
              <strong>Personalization Engine:</strong> Customizes puzzle generation based
              on individual user profiles, preferences, and performance history
            </li>
          </ul>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Technology Stack
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            Built on modern, production-ready technologies:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              <strong>Vercel AI SDK:</strong> Unified interface for multiple AI providers
              (OpenAI, Anthropic, Google) with automatic routing and cost optimization
            </li>
            <li>
              <strong>AI SDK Tools:</strong> Advanced orchestration, semantic caching, and
              state management for multi-agent systems
            </li>
            <li>
              <strong>Next.js 15:</strong> React framework with server components, API
              routes, and edge runtime support
            </li>
            <li>
              <strong>MongoDB:</strong> Document database for storing puzzles, user data,
              embeddings, and analytics
            </li>
            <li>
              <strong>Vector Operations:</strong> Cosine similarity calculations for
              semantic search and recommendation systems
            </li>
          </ul>
        </section>

        {/* Section 2: Puzzle Generation Pipeline */}
        <section className="mb-16">
          <h2 className="mb-6 font-semibold text-2xl text-foreground md:text-3xl">
            Puzzle Generation Pipeline
          </h2>
          <p className="mb-6 text-foreground text-base leading-relaxed md:text-lg">
            Every puzzle undergoes a rigorous six-stage generation pipeline designed to
            ensure quality, uniqueness, and appropriate difficulty.
          </p>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Stage 1: Chain-of-Thought Generation
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            Before generating a puzzle, the AI is instructed to think through the puzzle
            concept using chain-of-thought reasoning. This process involves:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              <strong>Conceptual Planning:</strong> The AI identifies the target answer and
              considers multiple approaches to represent it visually or textually
            </li>
            <li>
              <strong>Visual Strategy:</strong> For rebus puzzles, the AI plans which emojis,
              symbols, or words will best represent the concept
            </li>
            <li>
              <strong>Difficulty Assessment:</strong> The AI evaluates the inherent challenge
              level of the concept before generation
            </li>
            <li>
              <strong>Multi-Layer Thinking:</strong> The AI considers literal meanings,
              phonetic relationships, cultural references, and abstract connections
            </li>
          </ul>
          <p className="mb-6 text-foreground text-base leading-relaxed">
            This thinking process is captured in a structured format, allowing the system to
            understand the AI's reasoning and ensure puzzles are created with full
            comprehension rather than random generation.
          </p>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Stage 2: Uniqueness Validation
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            To prevent duplicate or near-duplicate puzzles, each generated puzzle undergoes
            semantic fingerprinting:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              <strong>Component Tracking:</strong> The system extracts key components (emojis,
              words, structure) and creates a fingerprint
            </li>
            <li>
              <strong>Semantic Similarity:</strong> Vector embeddings are generated and
              compared against existing puzzles using cosine similarity
            </li>
            <li>
              <strong>Similarity Threshold:</strong> Puzzles with more than 80% similarity to
              existing ones are automatically rejected
            </li>
            <li>
              <strong>Automatic Retry:</strong> If a puzzle fails uniqueness validation, the
              system generates a new variation with different components or approach
            </li>
          </ul>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Stage 3: Difficulty Calibration
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            The Difficulty Calibrator Agent analyzes the puzzle and adjusts its difficulty
            rating based on multiple weighted factors:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              <strong>Visual Ambiguity (20% weight):</strong> How clear are the visual
              elements? Crystal clear (1) to highly ambiguous (10)
            </li>
            <li>
              <strong>Cognitive Steps (30% weight):</strong> How many mental leaps are needed?
              Single step (1) to many complex steps (10)
            </li>
            <li>
              <strong>Cultural Knowledge (20% weight):</strong> How much cultural context is
              required? Universal (1) to deep cultural knowledge (10)
            </li>
            <li>
              <strong>Vocabulary Level (15% weight):</strong> How advanced is the vocabulary?
              Basic words (1) to advanced vocabulary (10)
            </li>
            <li>
              <strong>Pattern Novelty (15% weight):</strong> How unexpected is the pattern?
              Common pattern (1) to highly novel (10)
            </li>
          </ul>
          <p className="mb-6 text-foreground text-base leading-relaxed">
            The system maintains a minimum difficulty of 4 (hard) and targets the 4-8 range,
            ensuring all puzzles are challenging mid-level difficulties that push creative
            boundaries while remaining solvable.
          </p>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Stage 4: Quality Assurance
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            The Quality Evaluator Agent scores each puzzle across seven dimensions:
          </p>
          <ol className="mb-6 ml-6 list-decimal space-y-3 text-foreground text-base leading-relaxed">
            <li>
              <strong>Clarity:</strong> Is the puzzle clear and understandable? Are the
              instructions unambiguous?
            </li>
            <li>
              <strong>Creativity:</strong> Does the puzzle demonstrate creative thinking? Is
              it novel and interesting?
            </li>
            <li>
              <strong>Solvability:</strong> Can the puzzle be solved with reasonable effort?
              Is it fair and logical?
            </li>
            <li>
              <strong>Appropriateness:</strong> Is the content family-friendly? Does it avoid
              sensitive topics?
            </li>
            <li>
              <strong>Visual Appeal:</strong> For visual puzzles, are the elements well-chosen
              and aesthetically pleasing?
            </li>
            <li>
              <strong>Educational Value:</strong> Does the puzzle teach something or exercise
              cognitive skills?
            </li>
            <li>
              <strong>Fun Factor:</strong> Is the puzzle enjoyable to solve? Does it provide a
              satisfying "aha!" moment?
            </li>
          </ol>
          <p className="mb-6 text-foreground text-base leading-relaxed">
            Each dimension is scored on a 0-100 scale, and the scores are weighted and
            combined to produce an overall quality score. Puzzles must score above 70 to
            publish directly, 60-69 for revision, and below 60 are rejected with automatic
            retry up to 3 times.
          </p>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Stage 5: Adversarial Testing
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            Before final acceptance, puzzles undergo adversarial testing where the AI attempts
            to identify potential issues:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              <strong>Ambiguity Detection:</strong> Could the puzzle have multiple valid
              answers?
            </li>
            <li>
              <strong>Cultural Sensitivity:</strong> Are there any cultural assumptions that
              might exclude certain audiences?
            </li>
            <li>
              <strong>Accessibility Concerns:</strong> Is the puzzle accessible to players
              with different abilities or backgrounds?
            </li>
            <li>
              <strong>Edge Case Analysis:</strong> What happens if players interpret elements
              differently than intended?
            </li>
          </ul>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Stage 6: Final Validation
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            The final stage ensures all requirements are met:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>All required fields are present and valid</li>
            <li>Progressive hints are generated (3-5 hints per puzzle)</li>
            <li>Explanation is clear and educational</li>
            <li>Metadata is complete (category, difficulty, puzzle type)</li>
            <li>Puzzle is stored in database with proper indexing</li>
            <li>Vector embedding is generated for semantic search</li>
          </ul>
        </section>

        {/* Section 3: Multi-Agent Orchestration */}
        <section className="mb-16">
          <h2 className="mb-6 font-semibold text-2xl text-foreground md:text-3xl">
            Multi-Agent Orchestration
          </h2>
          <p className="mb-6 text-foreground text-base leading-relaxed md:text-lg">
            Rather than using a single AI model, Rebuzzle employs four specialized agents
            that work together to create optimal puzzles. Each agent has a specific role and
            expertise.
          </p>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Puzzle Generator Agent
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            The Generator Agent is responsible for creating the initial puzzle. It uses
            chain-of-thought reasoning to:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>Plan the puzzle concept and visual strategy</li>
            <li>Generate the puzzle content (emojis, words, structure)</li>
            <li>Create the answer and explanation</li>
            <li>Generate progressive hints</li>
            <li>Consider difficulty and category requirements</li>
          </ul>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Quality Evaluator Agent
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            The Quality Evaluator Agent reviews each puzzle and scores it across the seven
            quality dimensions. It provides:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>Detailed scoring for each dimension</li>
            <li>Identification of strengths and weaknesses</li>
            <li>Specific suggestions for improvement</li>
            <li>Overall quality score with reasoning</li>
            <li>Recommendations for revision or acceptance</li>
          </ul>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Difficulty Calibrator Agent
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            The Difficulty Calibrator Agent analyzes puzzles and adjusts difficulty ratings
            for accuracy. It:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>Evaluates complexity factors (visual ambiguity, cognitive steps, etc.)</li>
            <li>Calculates weighted difficulty scores</li>
            <li>Calibrates difficulty to match actual challenge level</li>
            <li>Ensures puzzles fall within the 4-8 difficulty range</li>
            <li>Provides difficulty reasoning and breakdown</li>
          </ul>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Personalized Generator Agent
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            When generating puzzles for specific users, the Personalized Generator Agent
            customizes the generation process based on:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>User's skill level and performance history</li>
            <li>Preferred difficulty range and puzzle types</li>
            <li>Favorite categories and themes</li>
            <li>Recent performance trends</li>
            <li>Hint usage patterns and engagement levels</li>
          </ul>
          <p className="mb-6 text-foreground text-base leading-relaxed">
            This agent ensures puzzles are appropriately challenging for each individual
            user, maintaining engagement without frustration.
          </p>
        </section>

        {/* Section 4: Quality Assurance */}
        <section className="mb-16">
          <h2 className="mb-6 font-semibold text-2xl text-foreground md:text-3xl">
            Quality Assurance System
          </h2>
          <p className="mb-6 text-foreground text-base leading-relaxed md:text-lg">
            Quality is not an afterthought—it's built into every stage of the generation
            process. Our quality assurance system ensures that only high-quality puzzles
            reach players.
          </p>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Quality Scoring System
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            Each puzzle receives a quality score from 0-100, calculated from weighted scores
            across seven dimensions. The scoring thresholds are:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              <strong>Exceptional (80-100):</strong> Rare, truly outstanding puzzles that are
              memorable and exceptional
            </li>
            <li>
              <strong>High Quality (70-79):</strong> High quality puzzles that are good and
              publishable
            </li>
            <li>
              <strong>Acceptable (60-69):</strong> Acceptable puzzles that are decent but may
              need minor improvements
            </li>
            <li>
              <strong>Needs Work (50-59):</strong> Puzzles with significant issues that need
              work
            </li>
            <li>
              <strong>Poor (0-49):</strong> Poor quality puzzles with major problems
            </li>
          </ul>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Automatic Retry Mechanism
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            When a puzzle fails quality checks, the system doesn't simply reject it. Instead:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>The Quality Evaluator provides specific improvement suggestions</li>
            <li>The Generator Agent creates a new version incorporating the feedback</li>
            <li>
              The process repeats up to 3 times, with each iteration improving based on
              previous feedback
            </li>
            <li>
              Only after 3 failed attempts is a puzzle rejected, ensuring maximum quality
              while maintaining efficiency
            </li>
          </ul>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Quality Metrics in Production
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            Our system achieves a publish rate of 85%+, meaning the vast majority of
            generated puzzles meet our quality standards. This high success rate is achieved
            through:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>Sophisticated prompt engineering that guides AI toward quality</li>
            <li>Multi-stage validation that catches issues early</li>
            <li>Automatic improvement loops that refine puzzles iteratively</li>
            <li>Learning from user feedback to improve generation over time</li>
          </ul>
        </section>

        {/* Section 5: Semantic Understanding */}
        <section className="mb-16">
          <h2 className="mb-6 font-semibold text-2xl text-foreground md:text-3xl">
            Semantic Understanding & Vector Embeddings
          </h2>
          <p className="mb-6 text-foreground text-base leading-relaxed md:text-lg">
            Rebuzzle doesn't just store puzzles as text—it understands their meaning through
            vector embeddings, enabling powerful semantic search and recommendation
            capabilities.
          </p>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Vector Embeddings
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            Every puzzle is converted into a high-dimensional vector (embedding) that
            represents its semantic meaning. The embedding is generated from:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>The puzzle content itself (emojis, words, structure)</li>
            <li>The answer and explanation</li>
            <li>The category and puzzle type</li>
            <li>Any thematic or contextual information</li>
          </ul>
          <p className="mb-6 text-foreground text-base leading-relaxed">
            These embeddings are stored in MongoDB alongside puzzle data, enabling fast
            similarity searches using cosine similarity calculations.
          </p>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Semantic Search
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            Unlike keyword-based search, semantic search understands meaning. For example:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              Searching for "puzzles about cats" finds cat-related puzzles even if the word
              "cat" doesn't appear (e.g., puzzles with 🐱 emoji)
            </li>
            <li>Finding similar puzzles by concept, not just by matching words</li>
            <li>Discovering puzzles with related themes or difficulty levels</li>
            <li>Identifying puzzles that require similar solving strategies</li>
          </ul>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Semantic Caching
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            To optimize performance and reduce costs, Rebuzzle uses semantic caching:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              When generating a puzzle, the system checks if a semantically similar puzzle
              was recently generated
            </li>
            <li>
              If similarity is above 85%, the cached result is returned instead of making a
              new AI API call
            </li>
            <li>
              This reduces redundant API calls, speeds up responses, and significantly
              reduces costs
            </li>
            <li>
              The cache uses meaning-based matching, so even if the exact prompt differs,
              similar requests are served from cache
            </li>
          </ul>
        </section>

        {/* Section 6: Puzzle Types */}
        <section className="mb-16">
          <h2 className="mb-6 font-semibold text-2xl text-foreground md:text-3xl">
            Puzzle Type System
          </h2>
          <p className="mb-6 text-foreground text-base leading-relaxed md:text-lg">
            Rebuzzle supports ten distinct puzzle types, each with specialized generation
            logic, validation rules, and difficulty calibration. This modular system allows
            each puzzle type to have its own configuration while sharing common infrastructure.
          </p>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Supported Puzzle Types
          </h3>
          <ol className="mb-6 ml-6 list-decimal space-y-4 text-foreground text-base leading-relaxed">
            <li>
              <strong>Rebus Puzzles:</strong> Visual word puzzles using emojis and symbols
              to represent words and phrases. Uses chain-of-thought reasoning to plan visual
              strategies.
            </li>
            <li>
              <strong>Word Puzzles:</strong> Anagrams, word searches, and cryptograms that
              test vocabulary and pattern recognition.
            </li>
            <li>
              <strong>Riddles:</strong> Lateral thinking puzzles that require wordplay,
              double meanings, and creative interpretation.
            </li>
            <li>
              <strong>Logic Grids:</strong> Einstein-style deductive reasoning puzzles with
              multiple categories and constraint satisfaction.
            </li>
            <li>
              <strong>Number Sequences:</strong> Mathematical pattern recognition puzzles
              requiring identification of arithmetic, geometric, or recursive patterns.
            </li>
            <li>
              <strong>Pattern Recognition:</strong> Visual or text-based sequences where
              players identify patterns and predict next elements.
            </li>
            <li>
              <strong>Caesar Ciphers:</strong> Cryptographic code-breaking puzzles using
              letter substitution.
            </li>
            <li>
              <strong>Cryptic Crosswords:</strong> Advanced crossword puzzles with wordplay
              and cryptic clues.
            </li>
            <li>
              <strong>Trivia:</strong> Knowledge-based challenge questions across various
              topics.
            </li>
            <li>
              <strong>Word Ladders:</strong> Transform one word into another by changing one
              letter at a time.
            </li>
          </ol>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Configuration-Driven Architecture
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            Each puzzle type has its own configuration file that defines:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              <strong>Schema:</strong> The data structure for puzzles of this type (fields,
              validation rules, required elements)
            </li>
            <li>
              <strong>Generation:</strong> System prompts, user prompts, temperature settings,
              and model preferences
            </li>
            <li>
              <strong>Validation:</strong> Custom validation rules specific to the puzzle type
            </li>
            <li>
              <strong>Difficulty:</strong> How difficulty is calculated for this type
              (complexity factors, weights, ranges)
            </li>
            <li>
              <strong>Hints:</strong> How progressive hints are generated (count, progression
              style, content guidelines)
            </li>
            <li>
              <strong>Quality Metrics:</strong> Type-specific quality scoring criteria
            </li>
          </ul>
          <p className="mb-6 text-foreground text-base leading-relaxed">
            This configuration-driven approach allows new puzzle types to be added easily
            while maintaining consistency and quality across all types.
          </p>
        </section>

        {/* Section 7: Learning & Adaptation */}
        <section className="mb-16">
          <h2 className="mb-6 font-semibold text-2xl text-foreground md:text-3xl">
            Learning & Adaptation
          </h2>
          <p className="mb-6 text-foreground text-base leading-relaxed md:text-lg">
            Rebuzzle continuously learns from user behavior to improve puzzle quality and
            difficulty calibration. This learning system ensures the platform gets better
            over time.
          </p>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Performance Analysis
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            The system tracks and analyzes:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              <strong>Solve Rates:</strong> What percentage of players successfully solve each
              puzzle?
            </li>
            <li>
              <strong>Time to Solve:</strong> How long do players take on average? Are puzzles
              too easy (solved quickly) or too hard (taking excessive time)?
            </li>
            <li>
              <strong>Hint Usage:</strong> How many hints do players need? High hint usage may
              indicate puzzles are too difficult.
            </li>
            <li>
              <strong>Abandonment Rates:</strong> Do players give up on certain puzzles? This
              may indicate quality or difficulty issues.
            </li>
          </ul>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Difficulty Calibration
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            Based on actual user performance, the system:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              Calculates actual difficulty from real user data (not just AI estimates)
            </li>
            <li>
              Identifies puzzles where predicted difficulty doesn't match actual difficulty
            </li>
            <li>Auto-calibrates difficulty ratings for accuracy</li>
            <li>
              Provides feedback to the generation system to improve future difficulty
              predictions
            </li>
          </ul>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Quality Improvement
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            The learning system identifies patterns in problematic puzzles:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              Puzzles with consistently low solve rates may have clarity or solvability issues
            </li>
            <li>Puzzles with high abandonment may be too difficult or confusing</li>
            <li>Puzzles with very high solve rates may be too easy</li>
            <li>The system generates improvement suggestions for future puzzle generation</li>
          </ul>
        </section>

        {/* Section 8: Personalization */}
        <section className="mb-16">
          <h2 className="mb-6 font-semibold text-2xl text-foreground md:text-3xl">
            Personalization Engine
          </h2>
          <p className="mb-6 text-foreground text-base leading-relaxed md:text-lg">
            For authenticated users, Rebuzzle builds detailed profiles and personalizes the
            puzzle experience to match individual preferences and skill levels.
          </p>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            User Profiling
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            The system builds comprehensive user profiles including:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              <strong>Skill Level:</strong> Estimated skill level (beginner/intermediate/advanced)
              based on performance
            </li>
            <li>
              <strong>Difficulty Preferences:</strong> Preferred difficulty range calculated
              from performance data
            </li>
            <li>
              <strong>Favorite Categories:</strong> Puzzle categories the user enjoys most
            </li>
            <li>
              <strong>Preferred Puzzle Types:</strong> Which puzzle types the user prefers
            </li>
            <li>
              <strong>Performance Metrics:</strong> Solve rates, average time, hint usage
              patterns
            </li>
            <li>
              <strong>Engagement Level:</strong> How actively the user engages with puzzles
            </li>
          </ul>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Adaptive Difficulty
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            The personalization engine automatically adjusts puzzle difficulty:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              If a user is solving puzzles quickly, the system suggests more challenging
              puzzles
            </li>
            <li>
              If a user is struggling, the system offers slightly easier puzzles to build
              confidence
            </li>
            <li>
              Difficulty adapts based on recent performance trends, not just overall history
            </li>
            <li>
              The system maintains users in their "sweet spot" of challenge—difficult enough
              to be engaging, but not so hard as to be frustrating
            </li>
          </ul>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Recommendation System
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            The recommendation engine combines multiple signals:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              <strong>Semantic Search:</strong> Finds puzzles similar to ones the user enjoyed
            </li>
            <li>
              <strong>Category-Based:</strong> Suggests puzzles in favorite categories
            </li>
            <li>
              <strong>Difficulty-Matched:</strong> Matches current skill level
            </li>
            <li>
              <strong>Performance-Based:</strong> Adjusts from recent performance data
            </li>
          </ul>
          <p className="mb-6 text-foreground text-base leading-relaxed">
            Recommendations improve as the system learns individual preferences and play
            patterns over time.
          </p>
        </section>

        {/* Section 9: Performance */}
        <section className="mb-16">
          <h2 className="mb-6 font-semibold text-2xl text-foreground md:text-3xl">
            Performance & Optimization
          </h2>
          <p className="mb-6 text-foreground text-base leading-relaxed md:text-lg">
            Rebuzzle is designed for scale and efficiency, with multiple optimization
            strategies to ensure fast responses and cost-effective operation.
          </p>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Caching Strategy
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            Multiple layers of caching reduce latency and costs:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              <strong>Daily Puzzle Cache:</strong> Each day's puzzle is generated once and
              cached for 24 hours, serving all users from the same cached result
            </li>
            <li>
              <strong>Semantic Cache:</strong> Similar puzzle generation requests are served
              from cache using semantic similarity matching
            </li>
            <li>
              <strong>Embedding Cache:</strong> Vector embeddings are cached to avoid
              redundant embedding generation
            </li>
            <li>
              <strong>Vercel Edge Caching:</strong> Static and dynamic content is cached at
              the edge for global performance
            </li>
          </ul>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Cost Optimization
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            The system prioritizes cost-effective operation:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              <strong>Free-Tier First:</strong> Prioritizes free-tier AI models with
              cost-ordered fallbacks
            </li>
            <li>
              <strong>Model Selection:</strong> Uses the most cost-effective model that meets
              quality requirements
            </li>
            <li>
              <strong>Batch Processing:</strong> Generates multiple puzzles in batches when
              possible
            </li>
            <li>
              <strong>Semantic Caching:</strong> Reduces redundant API calls through
              meaning-based cache matching
            </li>
          </ul>

          <h3 className="mb-4 mt-8 font-semibold text-xl text-foreground">
            Scalability
          </h3>
          <p className="mb-4 text-foreground text-base leading-relaxed">
            The serverless architecture ensures:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-3 text-foreground text-base leading-relaxed">
            <li>
              <strong>Automatic Scaling:</strong> Handles traffic spikes without manual
              intervention
            </li>
            <li>
              <strong>Edge Distribution:</strong> Content served from global edge locations
              for low latency
            </li>
            <li>
              <strong>Database Optimization:</strong> Indexed queries and efficient data
              structures for fast lookups
            </li>
            <li>
              <strong>Async Processing:</strong> Non-critical operations (like embedding
              generation) run asynchronously to avoid blocking requests
            </li>
          </ul>
        </section>

        {/* Conclusion */}
        <section className="mb-12">
          <h2 className="mb-6 font-semibold text-2xl text-foreground md:text-3xl">
            Conclusion
          </h2>
          <p className="mb-4 text-foreground text-base leading-relaxed md:text-lg">
            Rebuzzle represents a production-ready, enterprise-grade AI system for puzzle
            generation. It doesn't simply generate text—it thinks through puzzle creation,
            learns from user behavior, adapts to individual preferences, validates quality at
            multiple levels, understands semantic relationships, and improves over time.
          </p>
          <p className="mb-4 text-foreground text-base leading-relaxed md:text-lg">
            The combination of multi-agent orchestration, semantic understanding, continuous
            learning, and personalization creates a system that produces high-quality, unique,
            and engaging puzzles that get better with each interaction. This technical
            foundation enables Rebuzzle to scale to millions of users while maintaining
            quality and providing personalized experiences.
          </p>
        </section>

        {/* Back Link */}
        <div className="border-t border-border pt-8">
          <Link
            className="text-primary text-base hover:underline"
            href="/"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </Layout>
  );
}
