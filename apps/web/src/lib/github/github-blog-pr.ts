import "server-only";

import { importPKCS8, SignJWT } from "jose";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";

interface GitHubBlogConfig {
  owner: string;
  repository: string;
  baseBranch: string;
  draft: boolean;
}

interface GitHubResponse<T> {
  status: number;
  data: T | null;
}

export interface BlogPullRequestInput {
  slug: string;
  title: string;
  puzzleId: string;
  publishedAt: string;
  content: string;
}

export type BlogPullRequestSkipped = "already_published" | "pull_request_exists";

export type BlogPullRequestResult =
  | {
      success: true;
      skipped: BlogPullRequestSkipped;
      branch: string;
      contentPath: string;
      pullRequestNumber?: number;
      pullRequestUrl?: string;
    }
  | {
      success: true;
      branch: string;
      contentPath: string;
      pullRequestNumber: number;
      pullRequestUrl: string;
      draft: boolean;
    };

function getConfig(): GitHubBlogConfig {
  const repository =
    process.env.GITHUB_BLOG_REPOSITORY?.trim() || "byronwade/rebuzzle.byronwade.com";
  const [owner, name, ...extra] = repository.split("/");
  if (!(owner && name) || extra.length > 0) {
    throw new Error("GITHUB_BLOG_REPOSITORY must use the owner/repository format");
  }

  return {
    owner,
    repository: name,
    baseBranch: process.env.GITHUB_BLOG_BASE_BRANCH?.trim() || "main",
    draft: process.env.GITHUB_BLOG_PR_DRAFT !== "false",
  };
}

async function githubRequest<T>(
  token: string,
  path: string,
  init: RequestInit = {},
  allowedStatuses: number[] = []
): Promise<GitHubResponse<T>> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      "User-Agent": "rebuzzle-eve-blog-agent",
      ...init.headers,
    },
  });

  const data = response.status === 204 ? null : ((await response.json().catch(() => null)) as T);
  if (!(response.ok || allowedStatuses.includes(response.status))) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : `HTTP ${response.status}`;
    throw new Error(`GitHub API request failed (${response.status}): ${message}`);
  }
  return { status: response.status, data };
}

async function createAppInstallationToken(config: GitHubBlogConfig): Promise<string> {
  const appId = process.env.GITHUB_BLOG_APP_ID?.trim();
  const installationId = process.env.GITHUB_BLOG_APP_INSTALLATION_ID?.trim();
  const privateKey = process.env.GITHUB_BLOG_APP_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

  if (!(appId && installationId && privateKey)) {
    throw new Error(
      "GitHub blog PR authentication is not configured. Set GITHUB_BLOG_TOKEN or all GitHub App variables."
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(privateKey, "RS256");
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 9 * 60)
    .setIssuer(appId)
    .sign(key);

  const response = await githubRequest<{ token: string }>(
    jwt,
    `/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
    {
      method: "POST",
      body: JSON.stringify({
        repositories: [config.repository],
        permissions: { contents: "write", pull_requests: "write" },
      }),
    }
  );

  if (!response.data?.token) {
    throw new Error("GitHub App did not return an installation access token");
  }
  return response.data.token;
}

async function getToken(config: GitHubBlogConfig): Promise<string> {
  const token = process.env.GITHUB_BLOG_TOKEN?.trim();
  return token || createAppInstallationToken(config);
}

function branchName(input: BlogPullRequestInput): string {
  const date = new Date(input.publishedAt).toISOString().slice(0, 10);
  const puzzleKey = input.puzzleId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);
  return `content/eve-blog-${date}-${puzzleKey || "puzzle"}`;
}

function refPath(branch: string): string {
  return branch
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function contentPath(input: BlogPullRequestInput): string {
  return `apps/web/content/blog-posts/${input.slug}.json`;
}

export async function createBlogPostPullRequest(
  input: BlogPullRequestInput
): Promise<BlogPullRequestResult> {
  const config = getConfig();
  const token = await getToken(config);
  const repoPath = `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(
    config.repository
  )}`;
  const branch = branchName(input);
  const path = contentPath(input);
  const encodedContentPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const publishedFile = await githubRequest<unknown>(
    token,
    `${repoPath}/contents/${encodedContentPath}?ref=${encodeURIComponent(config.baseBranch)}`,
    {},
    [404]
  );
  if (publishedFile.status === 200) {
    return { success: true, skipped: "already_published", branch, contentPath: path };
  }

  const openPulls = await githubRequest<Array<{ number: number; html_url: string }>>(
    token,
    `${repoPath}/pulls?state=open&head=${encodeURIComponent(
      `${config.owner}:${branch}`
    )}&base=${encodeURIComponent(config.baseBranch)}`
  );
  const existingPull = openPulls.data?.[0];
  if (existingPull) {
    return {
      success: true,
      skipped: "pull_request_exists",
      branch,
      contentPath: path,
      pullRequestNumber: existingPull.number,
      pullRequestUrl: existingPull.html_url,
    };
  }

  const branchRef = await githubRequest<{ object: { sha: string } }>(
    token,
    `${repoPath}/git/ref/heads/${refPath(branch)}`,
    {},
    [404]
  );

  if (branchRef.status === 404) {
    const baseRef = await githubRequest<{ object: { sha: string } }>(
      token,
      `${repoPath}/git/ref/heads/${refPath(config.baseBranch)}`
    );
    if (!baseRef.data?.object.sha) {
      throw new Error(`Could not resolve GitHub base branch ${config.baseBranch}`);
    }
    await githubRequest(token, `${repoPath}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseRef.data.object.sha }),
    });
  }

  const branchFile = await githubRequest<{ sha: string }>(
    token,
    `${repoPath}/contents/${encodedContentPath}?ref=${encodeURIComponent(branch)}`,
    {},
    [404]
  );
  await githubRequest(token, `${repoPath}/contents/${encodedContentPath}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `content(blog): Add ${input.title}`.slice(0, 100),
      content: Buffer.from(input.content, "utf8").toString("base64"),
      branch,
      ...(branchFile.data?.sha ? { sha: branchFile.data.sha } : {}),
    }),
  });

  const pull = await githubRequest<{ number: number; html_url: string; draft: boolean }>(
    token,
    `${repoPath}/pulls`,
    {
      method: "POST",
      body: JSON.stringify({
        title: `content(blog): ${input.title}`.slice(0, 100),
        head: branch,
        base: config.baseBranch,
        draft: config.draft,
        maintainer_can_modify: true,
        body: [
          "## Eve-generated blog post",
          "",
          `- Puzzle ID: \`${input.puzzleId}\``,
          `- Puzzle date: ${new Date(input.publishedAt).toISOString().slice(0, 10)}`,
          `- Content file: \`${path}\``,
          "",
          "## Editorial review",
          "",
          "- [ ] The title does not reveal the answer",
          "- [ ] The puzzle display and explanation are accurate",
          "- [ ] The answer appears only in the solution section",
          "- [ ] The article is useful, original, and ready to publish",
          "",
          "Merging this pull request publishes the post on the next deployment.",
        ].join("\n"),
      }),
    }
  );

  if (!(pull.data?.number && pull.data.html_url)) {
    throw new Error("GitHub created the content commit but did not return a pull request");
  }

  return {
    success: true,
    branch,
    contentPath: path,
    pullRequestNumber: pull.data.number,
    pullRequestUrl: pull.data.html_url,
    draft: pull.data.draft,
  };
}
