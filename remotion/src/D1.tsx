import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { BRAND_FONT } from "./fonts";

// ── Tokens da marca (tema CLARO) ──────────────────────────────────────────────
const WHITE = "#FFFFFF";
const ICE = "#F4F7FC";
const NAVY = "#0A2A66";
const PINK = "#E6004C";

export const TRANSITION_FRAMES = 8;

export type D1Props = { sceneDurations: number[] };
type Word = { t: string; pink?: boolean };
type Kind = "intro" | "bars" | "gratis" | "cta";
type SceneDef = { audio: string; words: Word[]; caption: string; kind: Kind };

const SCENES: SceneDef[] = [
  {
    audio: "voiceover/d1/scene-0.mp3", kind: "intro",
    words: [{ t: "Tem" }, { t: "gente" }, { t: "procurando" }, { t: "dentista" }, { t: "no" }, { t: "seu" }, { t: "bairro", pink: true }],
    caption: "…e pode não ser você que aparece.",
  },
  {
    audio: "voiceover/d1/scene-1.mp3", kind: "bars",
    words: [{ t: "Busca" }, { t: "por" }, { t: "bairro", pink: true }],
    caption: "O paciente acha quem está perto. Não fique de fora.",
  },
  {
    audio: "voiceover/d1/scene-2.mp3", kind: "gratis",
    words: [{ t: "Grátis" }, { t: "no" }, { t: "Beta", pink: true }],
    caption: "Criar seu perfil leva 5 minutos.",
  },
  {
    audio: "voiceover/d1/scene-3.mp3", kind: "cta",
    words: [],
    caption: "Cadastre-se agora",
  },
];

// ── Util ──────────────────────────────────────────────────────────────────────
const useSpring = (delay = 0, config: object = { damping: 14, mass: 0.7 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
};

// ── Fundo: formas flutuantes sutis ────────────────────────────────────────────
const Blob: React.FC<{ x: number; y: number; r: number; color: string; phase: number }> = ({ x, y, r, color, phase }) => {
  const f = useCurrentFrame();
  const dy = Math.sin((f + phase) / 40) * 24;
  const dx = Math.cos((f + phase) / 55) * 18;
  return <div style={{ position: "absolute", left: x, top: y, width: r, height: r, borderRadius: "50%", background: color, transform: `translate(${dx}px,${dy}px)` }} />;
};
const Fundo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: WHITE, overflow: "hidden" }}>
    <Blob x={-140} y={1280} r={520} color="rgba(230,0,76,0.06)" phase={0} />
    <Blob x={760} y={-120} r={460} color="rgba(10,42,102,0.05)" phase={25} />
    <Blob x={820} y={1480} r={300} color="rgba(230,0,76,0.05)" phase={50} />
  </AbsoluteFill>
);

// ── Mascote coração-dente (animado) ───────────────────────────────────────────
const Mascote: React.FC<{ size?: number; delay?: number }> = ({ size = 300, delay = 0 }) => {
  const f = useCurrentFrame();
  const s = useSpring(delay, { damping: 10, mass: 0.8 });
  const bob = Math.sin(f / 12) * 14;
  const tilt = Math.sin(f / 22) * 3;
  return (
    <Img
      src={staticFile("logo-icon.png")}
      style={{ width: size, transform: `translateY(${bob}px) rotate(${tilt}deg) scale(${s})` }}
    />
  );
};

// ── Personagem "Dentinho" (imagem gerada por IA, recortada) ───────────────────
const Personagem: React.FC<{ src: string; size: number; delay?: number }> = ({ src, size, delay = 2 }) => {
  const f = useCurrentFrame();
  const t = Math.max(0, f - delay);
  const s = useSpring(delay, { damping: 10, mass: 0.8 });   // entrada com mola (pop)
  const hop = -Math.abs(Math.sin(t / 15)) * 18;             // pulinho contínuo
  const land = 1 - Math.abs(Math.sin(t / 15));              // 1 no chão, 0 no topo
  const breathe = 1 + 0.018 * Math.sin(t / 9);              // respiração
  const sx = breathe * (1 + 0.035 * land);                  // squash ao aterrissar
  const sy = breathe * (1 - 0.035 * land);
  const tilt = Math.sin(t / 22) * 2.4;                      // balanço
  return (
    <Img
      src={staticFile(src)}
      style={{
        width: size,
        transformOrigin: "50% 100%",
        transform: `translateY(${hop}px) rotate(${tilt}deg) scale(${s}) scaleX(${sx}) scaleY(${sy})`,
      }}
    />
  );
};

// ── Texto cinético (palavra a palavra) ────────────────────────────────────────
const KineticText: React.FC<{ words: Word[]; size?: number; delay?: number }> = ({ words, size = 112, delay = 4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px 26px", maxWidth: 940 }}>
      {words.map((w, i) => {
        const p = spring({ frame: frame - delay - i * 3, fps, config: { damping: 13, mass: 0.6 } });
        const y = interpolate(p, [0, 1], [70, 0]);
        const sc = interpolate(p, [0, 1], [0.6, 1]);
        return (
          <span key={i} style={{ display: "inline-block", fontFamily: BRAND_FONT, fontWeight: 700, fontSize: size, lineHeight: 1.02, color: w.pink ? PINK : NAVY, opacity: p, transform: `translateY(${y}px) scale(${sc})` }}>
            {w.t}
          </span>
        );
      })}
    </div>
  );
};

const Caption: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  const op = interpolate(f, [3, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", bottom: 130, left: 0, right: 0, textAlign: "center", opacity: op }}>
      <div style={{ display: "inline-block", height: 6, width: 90, background: PINK, borderRadius: 3, marginBottom: 24 }} />
      <div style={{ fontFamily: BRAND_FONT, fontWeight: 400, color: NAVY, fontSize: 44, lineHeight: 1.25, padding: "0 110px" }}>{text}</div>
    </div>
  );
};

// ── Conteúdos específicos ──────────────────────────────────────────────────────
const Barras: React.FC = () => {
  const frame = useCurrentFrame();
  const dados = [{ label: "Centro", v: 88 }, { label: "Campolim", v: 54 }, { label: "Vergueiro", v: 31 }];
  const maxV = 88; const H = 430;
  return (
    <div style={{ display: "flex", gap: 60, alignItems: "flex-end", height: H, marginTop: 150 }}>
      {dados.map((d, i) => {
        const g = interpolate(frame, [10 + i * 6, 38 + i * 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const h = (d.v / maxV) * H * g;
        const cor = i === 0 ? PINK : NAVY;
        return (
          <div key={d.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
            <div style={{ fontFamily: BRAND_FONT, fontWeight: 700, color: cor, fontSize: 44, opacity: g }}>{Math.round(d.v * g)}</div>
            <div style={{ width: 150, height: h, background: cor, borderRadius: "18px 18px 0 0" }} />
            <div style={{ fontFamily: BRAND_FONT, fontWeight: 400, color: NAVY, fontSize: 34, marginTop: 18 }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
};

const Zero: React.FC = () => {
  const s = useSpring(4, { damping: 9, mass: 0.7 });
  return (
    <div style={{ marginTop: 60, transform: `scale(${s})`, textAlign: "center" }}>
      <div style={{ fontFamily: BRAND_FONT, fontWeight: 700, color: PINK, fontSize: 220, lineHeight: 0.9 }}>R$ 0</div>
      <div style={{ fontFamily: BRAND_FONT, fontWeight: 400, color: NAVY, fontSize: 48, marginTop: 6 }}>durante o Beta</div>
    </div>
  );
};

// ── Cena ────────────────────────────────────────────────────────────────────
const Cena: React.FC<{ scene: SceneDef }> = ({ scene }) => {
  if (scene.kind === "cta") {
    const sLogo = useSpring(2, { damping: 12 });
    const sBtn = useSpring(14, { damping: 11, mass: 0.7 });
    const f = useCurrentFrame();
    const pulse = 1 + 0.03 * Math.sin(f / 6);
    return (
      <AbsoluteFill>
        <Fundo />
        <div style={{ height: 16, background: PINK }} />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 46 }}>
          <Personagem src="chars/Dentinho/dentinho-apontando-cutout.png" size={300} delay={2} />
          <Img src={staticFile("logo-pro.png")} style={{ width: 720, transform: `scale(${sLogo})` }} />
          <div style={{ transform: `scale(${sBtn})` }}>
            <div style={{ background: PINK, borderRadius: 999, padding: "34px 80px", transform: `scale(${pulse})`, boxShadow: "0 16px 40px rgba(230,0,76,0.3)" }}>
              <span style={{ fontFamily: BRAND_FONT, fontWeight: 700, color: WHITE, fontSize: 64 }}>Cadastre-se grátis</span>
            </div>
          </div>
          <div style={{ fontFamily: BRAND_FONT, fontWeight: 400, color: NAVY, fontSize: 48 }}>curadentes.com.br</div>
        </AbsoluteFill>
        <Caption text={scene.caption} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill>
      <Fundo />
      <div style={{ height: 16, background: PINK }} />
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", flexDirection: "column", paddingTop: scene.kind === "intro" ? 260 : 300 }}>
        {scene.kind === "intro" && <div style={{ marginBottom: 26 }}><Personagem src="chars/Dentinho/dentinho-acenando-cutout.png" size={340} delay={0} /></div>}
        <KineticText words={scene.words} size={scene.kind === "intro" ? 104 : 130} />
        {scene.kind === "bars" && <Barras />}
        {scene.kind === "bars" && <div style={{ marginTop: 40 }}><Personagem src="chars/Dentinho/dentinho-lupa-cutout.png" size={300} delay={18} /></div>}
        {scene.kind === "gratis" && <Zero />}
        {scene.kind === "gratis" && <div style={{ marginTop: 30 }}><Personagem src="chars/Dentinho/dentinho-cutout.png" size={320} delay={12} /></div>}
      </AbsoluteFill>
      <Caption text={scene.caption} />
    </AbsoluteFill>
  );
};

// ── Composição (com transições) ────────────────────────────────────────────────
export const D1: React.FC<D1Props> = ({ sceneDurations }) => {
  const dirs = ["from-right", "from-bottom", "from-left"] as const;
  return (
    <AbsoluteFill style={{ backgroundColor: ICE }}>
      <TransitionSeries>
        {SCENES.map((scene, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <TransitionSeries.Transition
                presentation={slide({ direction: dirs[(i - 1) % dirs.length] })}
                timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
              />
            )}
            <TransitionSeries.Sequence durationInFrames={sceneDurations[i] ?? 90}>
              <Cena scene={scene} />
              <Audio src={staticFile(scene.audio)} />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
