import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BlogPost from "@/components/BlogPost";
import Layout from "@/components/Layout";
import { generatePuzzleTypeMetadata } from "@/lib/seo/metadata";
import {
  generateBreadcrumbSchema,
  generateItemListSchema,
  generateWebPageSchema,
} from "@/lib/seo/structured-data";
import { getBaseUrl, getCanonicalUrl } from "@/lib/seo/utils";
import { fetchBlogPosts } from "../../actions/blogActions";

// Puzzle type metadata
const PUZZLE_TYPE_INFO: Record<
  string,
  {
    name: string;
    description: string;
    keywords: string[];
    examples: string[];
  }
> = {
  rebus: {
    name: "Rebus Puzzles",
    description:
      "Visual word puzzles using emojis, symbols, and text positioning. Combine visual elements to form words and phrases.",
    keywords: [
      "rebus puzzle",
      "visual word puzzle",
      "emoji puzzle",
      "picture puzzle",
      "rebus game",
    ],
    examples: ["🐝 + 4️⃣ = before", "☀️ + 🌻 = sunflower", "🧠 + ⛈️ = brainstorm"],
  },
  "logic-grid": {
    name: "Logic Grid Puzzles",
    description:
      "Einstein-style puzzles requiring deductive reasoning to solve relationships between multiple categories.",
    keywords: [
      "logic grid puzzle",
      "einstein puzzle",
      "deductive reasoning",
      "logic puzzle",
      "grid puzzle",
    ],
    examples: [
      "Who lives where?",
      "What color is each house?",
      "Solve the relationships",
    ],
  },
  "cryptic-crossword": {
    name: "Cryptic Crosswords",
    description:
      "British-style cryptic clues using wordplay, anagrams, homophones, and double definitions.",
    keywords: [
      "cryptic crossword",
      "cryptic clue",
      "wordplay puzzle",
      "anagram puzzle",
      "crossword puzzle",
    ],
    examples: [
      "Brave insect goes back and forth (4) = LION",
      "Part of tree in forest (4) = ROOT",
    ],
  },
  "number-sequence": {
    name: "Number Sequence Puzzles",
    description:
      "Identify mathematical patterns and predict the next number(s) in a sequence.",
    keywords: [
      "number sequence",
      "pattern recognition",
      "math puzzle",
      "sequence puzzle",
      "number pattern",
    ],
    examples: ["3, 7, 11, 15, ? = 19", "2, 6, 18, 54, ? = 162"],
  },
  "pattern-recognition": {
    name: "Pattern Recognition Puzzles",
    description:
      "Visual pattern identification requiring observation and logical thinking.",
    keywords: [
      "pattern recognition",
      "visual pattern",
      "pattern puzzle",
      "observation puzzle",
      "visual logic",
    ],
    examples: ["Find the pattern", "What comes next?", "Identify the rule"],
  },
  "caesar-cipher": {
    name: "Caesar Cipher Puzzles",
    description:
      "Decode encrypted messages using Caesar cipher (letter shifting) techniques.",
    keywords: [
      "caesar cipher",
      "cipher puzzle",
      "code breaking",
      "encryption puzzle",
      "cryptography",
    ],
    examples: ["ABC → DEF (shift 3)", "Encrypted message decoding"],
  },
  trivia: {
    name: "Trivia Puzzles",
    description:
      "Knowledge-based questions about geography, history, science, pop culture, and more.",
    keywords: [
      "trivia puzzle",
      "trivia question",
      "knowledge puzzle",
      "quiz puzzle",
      "trivia game",
    ],
    examples: [
      "What is the capital of France?",
      "In what year did World War II end?",
    ],
  },
};

/**
 * Generate metadata for puzzle type category page
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  const puzzleInfo = PUZZLE_TYPE_INFO[type];

  if (!puzzleInfo) {
    return {
      title: "Puzzle Type Not Found | Rebuzzle",
      description: "The requested puzzle type could not be found.",
    };
  }

  return generatePuzzleTypeMetadata(
    type,
    puzzleInfo.name,
    puzzleInfo.description,
    puzzleInfo.keywords
  );
}

export default async function PuzzleTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const puzzleInfo = PUZZLE_TYPE_INFO[type];

  if (!puzzleInfo) {
    notFound();
  }

  // Fetch blog posts for this puzzle type
  const allPosts = await fetchBlogPosts();
  const typePosts = allPosts.filter(
    (post) => post.puzzleType?.toLowerCase() === type.toLowerCase()
  );

  // Generate structured data
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: puzzleInfo.name, url: `/puzzles/${type}` },
  ]);

  const itemListSchema =
    typePosts.length > 0
      ? generateItemListSchema({
          items: typePosts.map((post) => ({
            slug: post.slug,
            title: post.title,
          })),
          name: `${puzzleInfo.name} Blog Posts`,
          description: `Collection of ${puzzleInfo.name.toLowerCase()} puzzle solutions`,
          url: `/puzzles/${type}`,
        })
      : null;

  const webPageSchema = generateWebPageSchema(
    `${puzzleInfo.name} - Rebuzzle`,
    puzzleInfo.description,
    getCanonicalUrl(`/puzzles/${type}`),
    `${getBaseUrl()}/opengraph-image`
  );

  // Get related puzzle types (exclude current)
  const relatedTypes = Object.keys(PUZZLE_TYPE_INFO).filter((t) => t !== type);

  return (
    <Layout>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
        type="application/ld+json"
      />
      {itemListSchema && (
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(itemListSchema),
          }}
          type="application/ld+json"
        />
      )}
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webPageSchema),
        }}
        type="application/ld+json"
      />

      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link
                className="text-muted-foreground transition-colors hover:text-foreground"
                href="/"
              >
                Home
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li>
              <Link
                className="text-muted-foreground transition-colors hover:text-foreground"
                href="/blog"
              >
                Blog
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li className="font-medium text-foreground">{puzzleInfo.name}</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-4 font-semibold text-base md:text-lg">
            {puzzleInfo.name}
          </h1>
          <p className="mb-4 text-muted-foreground text-sm">
            {puzzleInfo.description}
          </p>

          {/* Examples */}
          {puzzleInfo.examples.length > 0 && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <h2 className="mb-2 font-medium text-sm">Examples:</h2>
              <ul className="space-y-1 text-muted-foreground text-sm">
                {puzzleInfo.examples.map((example, idx) => (
                  <li className="flex items-start gap-2" key={idx}>
                    <span className="text-primary">•</span>
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Blog Posts */}
        {typePosts.length > 0 ? (
          <div className="space-y-6">
            <h2 className="font-semibold text-base">
              Recent {puzzleInfo.name} Solutions
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {typePosts.map((post) => (
                <BlogPost key={post.slug} post={post} />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/50 p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No {puzzleInfo.name.toLowerCase()} solutions yet. Check back soon!
            </p>
          </div>
        )}

        {/* Related Puzzle Types */}
        {relatedTypes.length > 0 && (
          <div className="mt-12 border-t pt-8">
            <h2 className="mb-4 font-semibold text-base">Other Puzzle Types</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {relatedTypes.slice(0, 6).map((relatedType) => {
                const relatedInfo = PUZZLE_TYPE_INFO[relatedType];
                if (!relatedInfo) return null;
                return (
                  <Link
                    className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
                    href={`/puzzles/${relatedType}`}
                    key={relatedType}
                  >
                    <h3 className="mb-1 font-medium text-sm">
                      {relatedInfo.name}
                    </h3>
                    <p className="line-clamp-2 text-muted-foreground text-xs">
                      {relatedInfo.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
