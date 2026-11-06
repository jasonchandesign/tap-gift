import { ImageResponse } from "next/og";
import { getGiftByToken } from "@/lib/gifts";

export const alt = "A virtual gift card from Tap Gift";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const gift = await getGiftByToken(token);
  const recipient = gift?.recipient_name ?? "you";
  const giver = gift?.giver_name ?? "someone special";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#b3263e",
          color: "white",
          border: "28px solid #fff7ec",
        }}
      >
        <div style={{ fontSize: 44 }}>A gift for</div>
        <div style={{ fontSize: 124, fontWeight: 700 }}>{recipient}</div>
        <div style={{ fontSize: 48, marginTop: 16 }}>{`From ${giver}`}</div>
        <div style={{ fontSize: 34, marginTop: 48, opacity: 0.85 }}>Tap to open</div>
      </div>
    ),
    size,
  );
}
