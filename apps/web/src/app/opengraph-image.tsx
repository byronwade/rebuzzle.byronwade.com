import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Default Open Graph image — ink-on-canvas with the Rebuzzle mark.
 */
export const alt = "Rebuzzle - Daily Rebus Puzzle Game";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "public/brand/logo-mark.png"));
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fafafa",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- OG ImageResponse */}
        <img
          alt=""
          height={128}
          src={logoSrc}
          style={{ marginBottom: 36, borderRadius: 28 }}
          width={128}
        />
        <div
          style={{
            fontSize: 72,
            fontWeight: 600,
            color: "#171717",
            letterSpacing: "-0.04em",
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          Rebuzzle
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#666666",
            textAlign: "center",
            letterSpacing: "-0.02em",
          }}
        >
          See it. Say it. Solve it.
        </div>
        <div
          style={{
            fontSize: 22,
            color: "#888888",
            marginTop: 28,
            textAlign: "center",
            maxWidth: 640,
          }}
        >
          One visual puzzle a day — free, local midnight unlock.
        </div>
      </div>
    </div>,
    {
      ...size,
    }
  );
}
