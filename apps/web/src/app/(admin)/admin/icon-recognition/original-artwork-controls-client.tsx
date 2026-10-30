"use client";
import { useEffect, useState } from "react";
import type {
  OriginalArtworkAdminResponse,
  OriginalArtworkAdminState,
} from "@/ai/puzzle-agent/review/original-artwork-admin-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function OriginalArtworkControls() {
  const [data, setData] = useState<OriginalArtworkAdminResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    void fetch("/api/admin/ai/original-artwork", { cache: "no-store" })
      .then(async (response) => {
        const result: OriginalArtworkAdminResponse = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load artwork approvals");
        if (!cancelled) setData(result);
      })
      .catch((cause) => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : "Could not load artwork approvals");
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);
  async function change(asset: OriginalArtworkAdminState, action: "approve" | "quarantine") {
    if (!data || busy) return;
    setBusy(asset.assetId);
    setError("");
    try {
      const response = await fetch("/api/admin/ai/original-artwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          assetId: asset.assetId,
          expectedStatusVersion: asset.statusVersion,
          expectedCatalogVersion: data.catalogVersion,
          reason: reasons[asset.assetId] || "",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Artwork change was not saved");
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Artwork change was not saved");
    } finally {
      setBusy(null);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Original artwork approvals</CardTitle>
        <CardDescription>
          Recognition evidence and editorial approval are separate. Approval records the exact
          drawing and its review evidence. Quarantine blocks future use; published puzzle images
          stay unchanged.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={Boolean(busy)}
          onClick={() => {
            setError("");
            setRevision((value) => value + 1);
          }}
        >
          Refresh approvals
        </Button>
        {!data && !error && <p role="status">Loading approvals…</p>}
        {data?.assets.map((asset) => (
          <details key={asset.assetId} className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {asset.concept} · {asset.status === "approved" ? "Recorded approval" : asset.status} ·{" "}
              {asset.recognitionEligible ? "Recognition qualified" : "Recognition pending"}
            </summary>
            <div className="mt-3 space-y-3">
              <p className="break-all text-xs text-muted-foreground">{asset.assetId}</p>
              <Button
                type="button"
                disabled={Boolean(busy) || !asset.recognitionEligible}
                onClick={() => void change(asset, "approve")}
              >
                {busy === asset.assetId
                  ? "Saving…"
                  : asset.status === "approved"
                    ? "Renew approval from current evidence"
                    : "Approve reviewed artwork"}
              </Button>
              {asset.status !== "candidate" && (
                <div className="space-y-2">
                  <Input
                    aria-label={`Quarantine reason for ${asset.concept}`}
                    placeholder="Reason for quarantine"
                    maxLength={300}
                    value={reasons[asset.assetId] || ""}
                    onChange={(event) =>
                      setReasons((value) => ({ ...value, [asset.assetId]: event.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      Boolean(busy) ||
                      !reasons[asset.assetId]?.trim() ||
                      asset.status === "quarantined"
                    }
                    onClick={() => void change(asset, "quarantine")}
                  >
                    Quarantine artwork
                  </Button>
                </div>
              )}
              {asset.auditHistory.length > 0 && (
                <ul
                  className="space-y-2 text-xs text-muted-foreground"
                  aria-label={`Recent approval history for ${asset.concept}`}
                >
                  {asset.auditHistory.map((entry, index) => (
                    <li key={`${entry.createdAt}:${index}`}>
                      {entry.action} · {new Date(entry.createdAt).toLocaleString()} ·{" "}
                      {entry.actorId}
                      <br />
                      {entry.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
