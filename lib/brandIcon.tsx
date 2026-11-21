import { ImageResponse } from "next/og";

/** Original placeholder app icon: sunset disc rising out of black fog, "MC" monogram. */
export function brandIcon(size: number) {
  const s = size / 100;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "linear-gradient(180deg, #7B2FF7 0%, #FF4F8B 55%, #FF8A3D 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 38 * s,
            background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 70%)",
          }}
        />
        <div
          style={{
            fontSize: 46 * s,
            fontWeight: 900,
            color: "#140A2E",
            letterSpacing: -2 * s,
            display: "flex",
          }}
        >
          MC
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
