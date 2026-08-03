"use client";

import { IconRecognitionShell } from "./icon-recognition-shell";
import { useIconRecognition } from "./use-icon-recognition";

export function IconRecognitionPageInner(props: any) {
  const state = useIconRecognition(props);
  return <IconRecognitionShell {...state} />;
}
