import { defineConfig } from "react-doctor/api";

export default defineConfig({
  ignore: {
    overrides: [
      {
        // These modules are only loaded via next/dynamic wrappers (AreaChart.tsx etc.)
        files: [
          "src/components/admin/charts/*.impl.tsx",
          "src/components/ui/chart.tsx",
        ],
        rules: ["react-doctor/prefer-dynamic-import"],
      },
      {
        // data: AI Gateway URLs cannot use next/image
        files: ["src/components/PuzzleVisualBoard.tsx"],
        rules: ["react-doctor/nextjs-no-img-element"],
      },
      {
        // Pinned external benchmark reference images must not be transformed by next/image
        files: ["**/benchmark-review/page.tsx"],
        rules: ["react-doctor/nextjs-no-img-element"],
      },
      {
        // Service worker returns Response objects; body is not consumed as JSON/text for success paths
        files: ["public/sw.js"],
        rules: ["react-doctor/no-fetch-response-used-without-status-check"],
      },
      {
        // Intentional sequential loops: billable LLM calls, Mongo index ops, email batching
        files: [
          "src/ai/puzzle-agent/apex/engine.ts",
          "src/ai/puzzle-agent/review/puzzle-playtest-backfill.ts",
          "src/ai/puzzle-agent/review/puzzle-playtest-service.ts",
          "src/ai/puzzle-agent/visual/compose-visual.ts",
          "src/ai/puzzle-agent/visual/editorial-review.ts",
          "src/ai/services/puzzle-learning.ts",
          "src/app/api/admin/blogs/generate-bulk/route.ts",
          "src/app/api/admin/puzzles/generate-bulk/route.ts",
          "src/app/api/admin/puzzles/generate-date-range/route.ts",
          "src/app/api/cron/send-notifications/route.ts",
          "src/db/indexes.ts",
        ],
        rules: ["react-doctor/async-await-in-loop"],
      },
      {
        // Intentional large page shells / admin dashboards — prior automated splits broke types;
        // keep cohesive until targeted extractions are designed. Prefer ignore over brittle shells.
        // Use ** globs: parentheses in (admin) route groups break literal path matching.
        files: [
          "**/admin-dashboard-client.tsx",
          "**/benchmark-review/page.tsx",
          "**/icon-recognition/page.tsx",
          "**/puzzle-playtests/page.tsx",
          "**/achievements-client.tsx",
          "**/game-over-client.tsx",
          "**/leaderboard-client.tsx",
          "**/login/page.tsx",
          "**/settings-client.tsx",
          "**/signup/page.tsx",
          "**/DevToolsPanel.tsx",
          "**/DevVisualLab.tsx",
          "**/GameBoard.tsx",
          "**/NotificationBadge.tsx",
          "**/SolveResultCard.tsx",
          "**/AIInsightsTab.tsx",
          "**/StatsTab.tsx",
        ],
        rules: ["react-doctor/no-giant-component"],
      },
    ],
  },
});
