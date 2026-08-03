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
    ],
  },
});
