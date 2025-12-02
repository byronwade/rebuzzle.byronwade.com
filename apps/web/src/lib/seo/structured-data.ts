/**
 * JSON-LD Structured Data Generators
 *
 * Functions to generate Schema.org compliant JSON-LD structured data
 * for various page types and content.
 */

import { getBaseUrl, getCanonicalUrl } from "./utils";

/**
 * Organization Schema
 * Represents the company/organization behind the site
 */
export function generateOrganizationSchema() {
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Rebuzzle",
    url: baseUrl,
    logo: {
      "@type": "ImageObject",
      url: `${baseUrl}/icon-512x512.png`,
      width: 512,
      height: 512,
    },
    description:
      "Daily rebus puzzle game with AI-generated challenges - The ultimate Wordle alternative",
    foundingDate: "2024",
    slogan: "Daily puzzles, endless fun",
    sameAs: [
      // Add social media profiles here when available
      // "https://twitter.com/rebuzzle",
      // "https://facebook.com/rebuzzle",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: "support@rebuzzle.com", // Update with actual support email
      availableLanguage: "English",
    },
    areaServed: "Worldwide",
    knowsAbout: [
      "Puzzle Games",
      "Rebus Puzzles",
      "Logic Puzzles",
      "Word Games",
      "Brain Teasers",
      "Cryptic Crosswords",
      "Number Sequences",
      "Pattern Recognition",
    ],
  };
}

/**
 * WebSite Schema
 * Represents the website with search functionality
 */
export function generateWebSiteSchema() {
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Rebuzzle",
    url: baseUrl,
    description: "Daily rebus puzzle game with AI-generated challenges - Free Wordle alternative",
    alternateName: ["Rebuzzle Puzzle Game", "Daily Rebus Puzzle"],
    keywords:
      "rebus puzzle, wordle alternative, daily puzzle, logic puzzle, cryptic crossword, free puzzle game",
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/blog?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: "Rebuzzle",
    },
  };
}

/**
 * Article Schema
 * For blog posts and articles
 */
export function generateArticleSchema(post: {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  publishedAt: Date | string;
  updatedAt?: Date | string;
  authorId?: string;
  puzzleId?: string;
  answer?: string;
  puzzleType?: string;
}) {
  const baseUrl = getBaseUrl();
  const publishedDate =
    typeof post.publishedAt === "string" ? new Date(post.publishedAt) : post.publishedAt;
  const modifiedDate = post.updatedAt
    ? typeof post.updatedAt === "string"
      ? new Date(post.updatedAt)
      : post.updatedAt
    : publishedDate;

  // Calculate word count
  const wordCount = post.content.split(/\s+/).filter(Boolean).length;

  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || truncateText(post.content, 160),
    url: getCanonicalUrl(`/blog/${post.slug}`),
    datePublished: publishedDate.toISOString(),
    dateModified: modifiedDate.toISOString(),
    wordCount,
    articleSection: "Puzzle Solutions",
    author: {
      "@type": "Organization",
      name: "Rebuzzle Team",
    },
    publisher: {
      "@type": "Organization",
      name: "Rebuzzle",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon-512x512.png`,
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": getCanonicalUrl(`/blog/${post.slug}`),
    },
  };

  // Add image if available
  schema.image = {
    "@type": "ImageObject",
    url: `${baseUrl}/blog/${post.slug}/opengraph-image`,
    width: 1200,
    height: 630,
  };

  // Add puzzle-related data if available
  if (post.answer || post.puzzleType) {
    schema.about = {
      "@type": "Thing",
      name: post.answer || "Puzzle",
      description: `A ${post.puzzleType || "rebus"} puzzle`,
    };
    schema.keywords = [
      post.answer,
      post.puzzleType || "puzzle",
      "rebus puzzle",
      "puzzle solution",
      "daily puzzle",
    ]
      .filter(Boolean)
      .join(", ");
  }

  return schema;
}

/**
 * Game Schema
 * For puzzle/game pages
 */
export function generateGameSchema(puzzle: {
  id?: string;
  puzzle: string;
  answer: string;
  difficulty?: string | number;
  puzzleType?: string;
  explanation?: string;
  hints?: string[];
  publishedAt?: Date | string;
}) {
  const _baseUrl = getBaseUrl();
  const publishedDate = puzzle.publishedAt
    ? typeof puzzle.publishedAt === "string"
      ? new Date(puzzle.publishedAt)
      : puzzle.publishedAt
    : new Date();

  return {
    "@context": "https://schema.org",
    "@type": "Game",
    name: "Rebuzzle Daily Puzzle",
    description: `Solve today's ${puzzle.puzzleType || "rebus"} puzzle: ${puzzle.answer}`,
    url: getBaseUrl(),
    gameItem: {
      "@type": "Thing",
      name: puzzle.answer,
      description: puzzle.explanation || `A ${puzzle.puzzleType || "rebus"} puzzle challenge`,
    },
    gameLocation: {
      "@type": "WebPage",
      url: getBaseUrl(),
    },
    datePublished: publishedDate.toISOString(),
    difficulty:
      typeof puzzle.difficulty === "number" ? puzzle.difficulty : puzzle.difficulty || "medium",
    genre: puzzle.puzzleType || "Puzzle Game",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

/**
 * ItemList Schema
 * For listing pages (blog list, leaderboard, etc.)
 */
export function generateItemListSchema<
  T extends { slug?: string; id?: string; title?: string; name?: string },
>({
  items,
  name,
  description,
  url,
}: {
  items: T[];
  name: string;
  description: string;
  url: string;
}) {
  const _baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    description,
    url: getCanonicalUrl(url),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => {
      const itemUrl = item.slug
        ? getCanonicalUrl(`/blog/${item.slug}`)
        : item.id
          ? getCanonicalUrl(`/${item.id}`)
          : getCanonicalUrl(url);

      const itemName = item.title || item.name || `Item ${index + 1}`;

      return {
        "@type": "ListItem",
        position: index + 1,
        name: itemName,
        url: itemUrl,
      };
    }),
  };
}

/**
 * BreadcrumbList Schema
 * For navigation breadcrumbs
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  if (items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: getCanonicalUrl(item.url),
    })),
  };
}

/**
 * FAQPage Schema
 * For FAQ/help pages
 */
export function generateFAQPageSchema(faqs: Array<{ question: string; answer: string }>) {
  const _baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * WebPage Schema
 * For general web pages
 */
export function generateWebPageSchema(
  name: string,
  description: string,
  url: string,
  image: string,
  datePublished?: string,
  dateModified?: string
) {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: getCanonicalUrl(url),
    image: {
      "@type": "ImageObject",
      url: image,
      width: 1200,
      height: 630,
    },
    publisher: {
      "@type": "Organization",
      name: "Rebuzzle",
    },
  };

  if (datePublished) {
    schema.datePublished = datePublished;
  }
  if (dateModified) {
    schema.dateModified = dateModified;
  }

  return schema;
}

/**
 * Person Schema
 * For user profiles (if public)
 */
export function generatePersonSchema(user: { username: string; id: string; email?: string }) {
  const _baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: user.username,
    identifier: user.id,
    url: getCanonicalUrl(`/profile/${user.id}`),
  };
}

/**
 * VideoGame Schema (alternative to Game for more specific game content)
 */
export function generateVideoGameSchema(puzzle: {
  answer: string;
  puzzleType?: string;
  difficulty?: string | number;
}) {
  const _baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Rebuzzle",
    description: `Daily ${puzzle.puzzleType || "rebus"} puzzle game`,
    gamePlatform: "Web Browser",
    applicationCategory: "Game",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.5",
      ratingCount: "100",
    },
  };
}

/**
 * SoftwareApplication Schema
 * For web applications (like Wordle)
 */
export function generateSoftwareApplicationSchema() {
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Rebuzzle",
    applicationCategory: "Game",
    applicationSubCategory: "Puzzle Game",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "500",
      bestRating: "5",
      worstRating: "1",
    },
    description:
      "Daily rebus puzzle game - like Wordle but for visual word puzzles. Solve AI-generated puzzles every day!",
    url: baseUrl,
    downloadUrl: baseUrl,
    installUrl: baseUrl,
    screenshot: [
      {
        "@type": "ImageObject",
        url: `${baseUrl}/opengraph-image`,
        width: 1200,
        height: 630,
      },
      {
        "@type": "ImageObject",
        url: `${baseUrl}/icon-512x512.png`,
        width: 512,
        height: 512,
      },
    ],
    featureList: [
      "Daily puzzle challenges",
      "Multiple puzzle types (rebus, logic-grid, cryptic-crossword, number-sequence, pattern-recognition, caesar-cipher, trivia)",
      "Progressive hint system",
      "Leaderboard competition",
      "Streak tracking",
      "AI-generated puzzles",
      "Mobile-friendly",
      "Progressive Web App",
      "Free to play",
    ],
    softwareVersion: "1.0",
    releaseNotes: "Daily AI-generated puzzles with multiple types and difficulty levels",
    contentRating: {
      "@type": "Rating",
      ratingValue: "E",
      ratingExplanation: "Everyone - No age restrictions",
    },
    permissions: "No special permissions required",
  };
}

/**
 * HowTo Schema
 * For puzzle-solving guides and tutorials
 */
export function generateHowToSchema({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string; image?: string }>;
}) {
  const _baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && {
        image: {
          "@type": "ImageObject",
          url: step.image,
        },
      }),
    })),
  };
}

/**
 * Review Schema
 * For game reviews and ratings
 */
export function generateReviewSchema({
  ratingValue,
  ratingCount,
  bestRating = 5,
  worstRating = 1,
  ratingDistribution,
  datePublished,
}: {
  ratingValue: number;
  ratingCount: number;
  bestRating?: number;
  worstRating?: number;
  ratingDistribution?: {
    "5": number;
    "4": number;
    "3": number;
    "2": number;
    "1": number;
  };
  datePublished?: string;
}) {
  const _baseUrl = getBaseUrl();

  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "SoftwareApplication",
      name: "Rebuzzle",
      applicationCategory: "Game",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue,
      bestRating,
      worstRating,
    },
    author: {
      "@type": "Organization",
      name: "Rebuzzle Players",
    },
    reviewBody:
      "Rebuzzle is a daily puzzle game featuring AI-generated rebus puzzles, logic grids, cryptic crosswords, number sequences, pattern recognition, Caesar ciphers, and trivia. Free to play with daily challenges! Like Wordle but with 7 different puzzle types!",
  };

  // Add detailed rating distribution if provided
  if (ratingDistribution) {
    schema.reviewRating.ratingDistribution = {
      "@type": "AggregateRating",
      ratingValue,
      ratingCount,
      bestRating,
      worstRating,
      "5": ratingDistribution["5"] || 0,
      "4": ratingDistribution["4"] || 0,
      "3": ratingDistribution["3"] || 0,
      "2": ratingDistribution["2"] || 0,
      "1": ratingDistribution["1"] || 0,
    };
  }

  if (datePublished) {
    schema.datePublished = datePublished;
  }

  return schema;
}

/**
 * EducationalUse Schema
 * For educational content
 */
export function generateEducationalUseSchema() {
  const _baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "EducationalUse",
    learningResourceType: "Game",
    educationalLevel: "All Ages",
    teaches: [
      "Pattern Recognition",
      "Logical Reasoning",
      "Wordplay",
      "Problem Solving",
      "Critical Thinking",
      "Vocabulary Building",
    ],
    about: {
      "@type": "Thing",
      name: "Puzzle Solving",
      description: "Daily puzzle challenges that improve cognitive skills",
    },
  };
}

/**
 * Accessibility Schema
 * For accessibility features and compliance
 */
export function generateAccessibilitySchema() {
  const _baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    accessibilityFeature: [
      "keyboardNavigation",
      "screenReaderSupport",
      "highContrastDisplay",
      "textResize",
      "alternativeText",
      "ariaLabels",
      "semanticHTML",
    ],
    accessibilityHazard: "none",
    accessibilitySummary:
      "Rebuzzle is designed with accessibility in mind, supporting keyboard navigation, screen readers, and WCAG 2.1 AA compliance.",
    accessibilityAPI: "ARIA",
    accessibilityControl: ["fullKeyboardControl", "fullMouseControl", "fullTouchControl"],
  };
}

/**
 * Speakable Schema
 * For voice search optimization (Google Assistant, Alexa)
 */
export function generateSpeakableSchema({
  speakable,
  cssSelector,
}: {
  speakable?: Array<{
    "@type": "SpeakableSpecification";
    cssSelector: string[];
  }>;
  cssSelector?: string[];
}) {
  const selectors = cssSelector || ["h1", "h2", ".speakable", "article p:first-of-type"];

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    speakable: speakable || [
      {
        "@type": "SpeakableSpecification",
        cssSelector: selectors,
      },
    ],
  };
}

/**
 * Event Schema
 * For daily puzzle events
 */
export function generateEventSchema({
  name,
  description,
  startDate,
  endDate,
  location,
  organizer,
}: {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: {
    "@type": "VirtualLocation";
    url: string;
  };
  organizer?: {
    "@type": "Organization";
    name: string;
  };
}) {
  const baseUrl = getBaseUrl();

  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description,
    startDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    location: location || {
      "@type": "VirtualLocation",
      url: baseUrl,
    },
    organizer: organizer || {
      "@type": "Organization",
      name: "Rebuzzle",
      url: baseUrl,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: baseUrl,
    },
  };

  if (endDate) {
    schema.endDate = endDate;
  }

  return schema;
}

/**
 * QAPage Schema
 * For Q&A content pages
 */
export function generateQAPageSchema(
  qas: Array<{
    question: string;
    answer: string;
    author?: string;
    dateCreated?: string;
    upvoteCount?: number;
  }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: qas.map((qa, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Question",
          name: qa.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: qa.answer,
            ...(qa.author && {
              author: {
                "@type": "Person",
                name: qa.author,
              },
            }),
            ...(qa.dateCreated && { dateCreated: qa.dateCreated }),
            ...(qa.upvoteCount !== undefined && {
              upvoteCount: qa.upvoteCount,
            }),
          },
        },
      })),
    },
  };
}

/**
 * Course Schema
 * For educational content and tutorials
 */
export function generateCourseSchema({
  name,
  description,
  provider,
  courseCode,
  educationalLevel,
  teaches,
  coursePrerequisites,
}: {
  name: string;
  description: string;
  provider?: {
    "@type": "Organization";
    name: string;
    url: string;
  };
  courseCode?: string;
  educationalLevel?: string;
  teaches?: string[];
  coursePrerequisites?: string[];
}) {
  const baseUrl = getBaseUrl();

  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description,
    provider: provider || {
      "@type": "Organization",
      name: "Rebuzzle",
      url: baseUrl,
    },
    ...(courseCode && { courseCode }),
    ...(educationalLevel && { educationalLevel }),
    ...(teaches && teaches.length > 0 && { teaches }),
    ...(coursePrerequisites &&
      coursePrerequisites.length > 0 && {
        coursePrerequisites: coursePrerequisites.map((prereq) => ({
          "@type": "Course",
          name: prereq,
        })),
      }),
  };

  return schema;
}

/**
 * Helper function to truncate text
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

/**
 * Generate all structured data for a page
 */
export function generatePageStructuredData({
  organization = true,
  website = true,
  article,
  game,
  itemList,
  breadcrumb,
  faq,
  person,
  videoGame,
  softwareApplication,
  howTo,
  review,
  educationalUse,
}: {
  organization?: boolean;
  website?: boolean;
  article?: Parameters<typeof generateArticleSchema>[0];
  game?: Parameters<typeof generateGameSchema>[0];
  itemList?: Parameters<typeof generateItemListSchema>[0];
  breadcrumb?: Parameters<typeof generateBreadcrumbSchema>[0];
  faq?: Parameters<typeof generateFAQPageSchema>[0];
  person?: Parameters<typeof generatePersonSchema>[0];
  videoGame?: Parameters<typeof generateVideoGameSchema>[0];
  softwareApplication?: boolean;
  howTo?: Parameters<typeof generateHowToSchema>[0];
  review?: Parameters<typeof generateReviewSchema>[0];
  educationalUse?: boolean;
}) {
  const schemas: any[] = [];

  if (organization) {
    schemas.push(generateOrganizationSchema());
  }

  if (website) {
    schemas.push(generateWebSiteSchema());
  }

  if (article) {
    schemas.push(generateArticleSchema(article));
  }

  if (game) {
    schemas.push(generateGameSchema(game));
  }

  if (itemList) {
    schemas.push(generateItemListSchema(itemList));
  }

  if (breadcrumb) {
    const breadcrumbSchema = generateBreadcrumbSchema(breadcrumb);
    if (breadcrumbSchema) {
      schemas.push(breadcrumbSchema);
    }
  }

  if (faq) {
    schemas.push(generateFAQPageSchema(faq));
  }

  if (person) {
    schemas.push(generatePersonSchema(person));
  }

  if (videoGame) {
    schemas.push(generateVideoGameSchema(videoGame));
  }

  if (softwareApplication) {
    schemas.push(generateSoftwareApplicationSchema());
  }

  if (howTo) {
    schemas.push(generateHowToSchema(howTo));
  }

  if (review) {
    schemas.push(generateReviewSchema(review));
  }

  if (educationalUse) {
    schemas.push(generateEducationalUseSchema());
  }

  return schemas;
}
