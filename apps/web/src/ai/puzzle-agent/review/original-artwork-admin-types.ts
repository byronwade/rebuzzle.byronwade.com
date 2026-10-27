export type OriginalArtworkAdminState = {
  assetId: string;
  concept: string;
  status: "candidate" | "approved" | "quarantined";
  statusVersion: number;
  recognitionEligible: boolean;
  auditHistory: Array<{ action: string; reason: string; actorId: string; createdAt: string }>;
};
export type OriginalArtworkAdminResponse = {
  catalogVersion: string;
  assets: OriginalArtworkAdminState[];
  error?: string;
};
