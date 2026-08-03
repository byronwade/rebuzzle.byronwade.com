"use client";

import { BenchmarkReviewShell } from "./benchmark-review-shell";
import { useBenchmarkReview } from "./use-benchmark-review";

export function BenchmarkReviewPageInner(props: any) {
  const state = useBenchmarkReview(props);
  return <BenchmarkReviewShell {...state} />;
}
