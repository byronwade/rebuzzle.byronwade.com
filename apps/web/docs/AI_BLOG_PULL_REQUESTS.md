# AI blog pull requests

Eve does not publish generated articles directly. The daily blog workflow now:

1. selects yesterday's published puzzle;
2. generates the structured article;
3. validates the complete repository-content contract;
4. creates an `content/eve-blog-*` branch;
5. commits `apps/web/content/blog-posts/<slug>.json`;
6. opens a draft pull request with an editorial checklist;
7. publishes only after a human merges the PR and the site deploys.

The operation is idempotent per puzzle. Existing MongoDB blog posts, existing
proposals, open PRs, and already-merged content files are detected before another
proposal is created.

## Recommended authentication: GitHub App

Create a GitHub App and install it only on
`byronwade/rebuzzle.byronwade.com`. Grant these repository permissions:

- **Contents:** Read and write
- **Pull requests:** Read and write
- **Metadata:** Read-only (automatically granted)

Set these encrypted runtime variables:

```text
GITHUB_BLOG_APP_ID
GITHUB_BLOG_APP_INSTALLATION_ID
GITHUB_BLOG_APP_PRIVATE_KEY
GITHUB_BLOG_REPOSITORY=byronwade/rebuzzle.byronwade.com
GITHUB_BLOG_BASE_BRANCH=main
GITHUB_BLOG_PR_DRAFT=true
```

The private key may be stored as a multiline PEM or with literal `\n` separators.
The app JWT is short-lived, and the installation token requested by the workflow
expires after one hour.

For local testing only, `GITHUB_BLOG_TOKEN` can replace the three GitHub App
variables. Use a fine-grained token scoped to this repository with only Contents
and Pull requests read/write permissions.

## Publication behavior

Repository files take precedence over legacy MongoDB posts with the same slug.
Merged posts participate in the blog list, individual page, archive, filters,
search, adjacent navigation, SEO metadata, RSS/sitemap callers, and morning email
selection. Invalid JSON fails the build so malformed AI content cannot silently
reach production.

## Verification

```powershell
pnpm.cmd exec jest src/lib/github/__tests__/github-blog-pr.test.ts `
  src/lib/blog/__tests__/repository-posts.test.ts --runInBand
pnpm.cmd exec tsc --noEmit
pnpm.cmd build
```

GitHub API references:

- https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app
- https://docs.github.com/en/rest/git/refs
- https://docs.github.com/en/rest/repos/contents
- https://docs.github.com/en/rest/pulls/pulls#create-a-pull-request
