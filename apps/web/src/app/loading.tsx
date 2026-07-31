/**
 * Root Suspense boundary required by Cache Components.
 *
 * Intentionally empty: we do not want a full-page skeleton flash on navigation.
 * Routes with real async work should wrap that work in in-page <Suspense>
 * with a content-shaped fallback (see home, leaderboard, blog).
 */
export default function RootLoading() {
  return null;
}
