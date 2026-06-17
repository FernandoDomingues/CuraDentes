import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Img,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { Audio } from "@remotion/media";
import { BRAND_FONT } from "./fonts";

const NAVY = "#0A2A66";
const PINK = "#E6004C";
const WHITE = "#FFFFFF";

// Legenda (subtítulo) da fala — estilo viral, frase a frase
const PHRASES = [
  { t: "Tem gente procurando dentista no seu bairro", from: 0 },
  { t: "…e pode não ser você que aparece", from: 95 },
];

const Legenda: React.FC = () => {
  const f = useCurrentFrame();
  let active = PHRASES[0];
  for (const p of PHRASES) if (f >= p.from) active = p;
  const local = f - active.from;
  const op = interpolate(local, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(local, [0, 8], [26, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", opacity: op, transform: `translateY(${y}px)` }}>
      <div style={{ display: "inline-block", height: 8, width: 92, background: PINK, borderRadius: 4, marginBottom: 22 }} />
      <div style={{ fontFamily: BRAND_FONT, fontWeight: 700, color: NAVY, fontSize: 66, lineHeight: 1.12, padding: "0 70px", textShadow: "0 2px 18px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.9)" }}>
        {active.t}
      </div>
    </div>
  );
};

export const S0: React.FC = () => {
  const f = useCurrentFrame();
  const logoOp = interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: WHITE }}>
      <OffthreadVideo src={staticFile("chars/Dentinho/video/scene-0_9x16.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      {/* faixa de acento no topo */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, background: PINK }} />
      <Img src={staticFile("logo-pro.png")} style={{ position: "absolute", top: 48, left: 48, width: 230, opacity: logoOp }} />
      <Legenda />
      <Audio src={staticFile("voiceover/d1/scene-0.mp3")} />
    </AbsoluteFill>
  );
};
