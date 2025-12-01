# Blog Generation Testing Guide

## Current Status

The blog generator is implemented and ready to test, but there's a dependency issue with `@ai-sdk/gateway` that needs to be resolved first.

## Issue

The `@ai-sdk/gateway` package is trying to import `zod/v3` which doesn't exist in the current zod version (3.24.1). This causes a module resolution error when trying to use the blog generation API.

## Testing the Blog Generator

Once the dependency issue is resolved, you can test the blog generator using the Workflow API:

### Using the Workflow API

The blog generation is integrated into the daily workflow:

1. Visit: `http://localhost:3000/api/workflows/daily-content`
2. This will generate both a new puzzle and a blog post for yesterday's puzzle

## Expected Behavior

When working correctly, the blog generator should:

1. ✅ Generate a comprehensive blog post (1200-2500 words) from a puzzle
2. ✅ Extract title, slug, and excerpt from the generated content
3. ✅ Save the blog post to the database
4. ✅ Display on the blog list page at `/blog`
5. ✅ Display the full post at `/blog/[slug]`

## Blog Post Structure

The generated blog posts follow this structure:

1. Executive Summary (100-150 words)
2. Puzzle Analysis & Solution (300-400 words)
3. Cognitive Science Deep Dive (300-400 words)
4. Linguistic & Semiotic Analysis (200-300 words)
5. Historical & Cultural Context (200-300 words)
6. Puzzle Design Analysis (200-300 words)
7. Educational Applications (150-200 words)
8. Research & Insights (150-200 words)
9. Conclusion & Call to Action (100-150 words)

## Fixing the Dependency Issue

To fix the zod dependency issue, you have a few options:

### Option 1: Update Dependencies

```bash
npm update @ai-sdk/gateway zod
```

### Option 2: Use Google Provider Directly

Set `AI_PROVIDER=google` in your `.env.local` file to bypass the gateway:

```env
AI_PROVIDER=google
GOOGLE_AI_API_KEY=your-key-here
```

### Option 3: Wait for Package Update

The `@ai-sdk/gateway` package may need an update to support the current zod version. Check for updates:

```bash
npm outdated @ai-sdk/gateway
```

## Verification Steps

Once the dependency issue is resolved:

1. **Generate a blog post**: Call the workflow API route to generate blog posts
2. **Check the database**: Verify the post was saved
3. **View the blog list**: Visit `/blog` to see the new post
4. **View the full post**: Click on the post to see the full content
5. **Verify formatting**: Check that markdown is rendered correctly

## Files Involved

- `src/ai/services/blog-generator.ts` - Blog generation service
- `src/ai/config/blog.ts` - Blog generation configuration
- `src/app/actions/blogActions.ts` - Blog post database operations
- `src/app/blog/page.tsx` - Blog list page
- `src/app/blog/[slug]/page.tsx` - Individual blog post page
- `src/components/BlogPost.tsx` - Blog post card component
- `src/components/BlogPostContent.tsx` - Full blog post component


