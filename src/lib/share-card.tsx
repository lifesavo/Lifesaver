import { ImageResponse } from "next/og";

export const shareSize = { width: 1200, height: 630 };
export const shareContentType = "image/png";

export function ShareCard() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #E01470 0%, #6D28D9 52%, #0891B2 100%)",
          color: "white",
          padding: 72,
          fontFamily: "Arial Black, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                border: "14px solid #FF4D94",
                background: "#2A1038",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 14, background: "#D6FF4A" }} />
            </div>
            <div style={{ fontSize: 42, letterSpacing: -1 }}>LifeSaver</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 860 }}>
            <div style={{ fontSize: 78, lineHeight: 0.95, letterSpacing: -2 }}>
              Stop getting robbed by your bills.
            </div>
            <div style={{ fontSize: 32, fontFamily: "Arial, sans-serif" }}>Save money without trying.</div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div
              style={{
                background: "#D6FF4A",
                color: "#2A1038",
                borderRadius: 999,
                padding: "12px 22px",
                fontSize: 28,
              }}
            >
              $7.99/mo for life
            </div>
            <div
              style={{
                background: "#FFB020",
                color: "#2A1038",
                borderRadius: 999,
                padding: "12px 22px",
                fontSize: 28,
              }}
            >
              Lend a Hand $20.00
            </div>
          </div>
        </div>
      </div>
    ),
    shareSize,
  );
}
