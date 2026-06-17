import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { CenaFala, CenaFalaProps } from "./CenaFala";

export const REEL_TRANS = 8;

export type ReelCena = CenaFalaProps & { dur: number };
export type ReelD1Props = { cenas: ReelCena[] };

const dirs = ["from-right", "from-bottom", "from-left"] as const;

export const ReelD1: React.FC<ReelD1Props> = ({ cenas }) => {
  if (!cenas || cenas.length === 0) return <AbsoluteFill style={{ backgroundColor: "#fff" }} />;
  return (
    <AbsoluteFill style={{ backgroundColor: "#fff" }}>
      <Audio src={staticFile("music/bg.mp3")} volume={0.2} />
      <TransitionSeries>
        {cenas.map((c, i) => (
          <TransitionSeries.Sequence key={i} durationInFrames={c.dur}>
            <CenaFala video={c.video} audio={c.audio} phrases={c.phrases} />
          </TransitionSeries.Sequence>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
