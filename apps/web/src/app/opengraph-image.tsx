import { ImageResponse } from "next/og";

/**
 * Default Open Graph Image
 *
 * Generates a dynamic OG image for the homepage with branding
 */
export const alt = "Rebuzzle - Daily Rebus Puzzle Game";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#8b5cf6",
        backgroundImage: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)",
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
        <div
          style={{
            fontSize: "120px",
            marginBottom: "40px",
          }}
        >
          🧩
        </div>
        <div
          style={{
            fontSize: "72px",
            fontWeight: "bold",
            color: "white",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          Rebuzzle
        </div>
        <div
          style={{
            fontSize: "32px",
            color: "rgba(255, 255, 255, 0.9)",
            textAlign: "center",
          }}
        >
          Daily Rebus Puzzle Game
        </div>
        <div
          style={{
            fontSize: "24px",
            color: "rgba(255, 255, 255, 0.8)",
            marginTop: "40px",
            textAlign: "center",
          }}
        >
          Challenge your mind with AI-generated puzzles every day
        </div>
      </div>
    </div>,
    {
      ...size,
    }
  );
}
