import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0b1220",
          color: "white",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 120,
          fontWeight: 700
        }}
      >
        RT
      </div>
    ),
    size
  );
}
