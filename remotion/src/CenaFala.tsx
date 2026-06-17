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

export type Phrase = { t: string; from: number };
export type CenaFalaProps = { video: string; audio: string; phrases: Phrase[] };

const Legenda: React.FC<{ phrases: Phrase[] }> = ({ phrases }) => {
  const f = useCurrentFrame();
  let active = phrases[0];
  for (const p of phrases) if (f >= p.from) active = p;
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

// Cena "personagem falando": vídeo (já cortado 9:16) em tela cheia + logo + legenda + voz PT-BR.
export const CenaFala: React.FC<CenaFalaProps> = ({ video, audio, phrases }) => {
  const f = useCurrentFrame();
  const logoOp = interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: WHITE }}>
      <OffthreadVideo src={staticFile(video)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, background: PINK }} />
      <Img src={staticFile("logo-nome.png")} style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", width: 360, opacity: logoOp }} />
      <Legenda phrases={phrases} />
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
