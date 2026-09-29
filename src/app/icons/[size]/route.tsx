import { ImageResponse } from "next/og";

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = (await params).size === "512" ? 512 : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ff6a3d 0%, #ff2e55 100%)",
          color: "white",
          fontSize: size * 0.62,
          fontWeight: 900,
          letterSpacing: -size * 0.04,
        }}
      >
        J
      </div>
    ),
    { width: size, height: size, headers: { "cache-control": "public, max-age=31536000, immutable" } },
  );
}
