import "./index.css";
import { Composition, staticFile } from "remotion";
import { D1, D1Props, TRANSITION_FRAMES } from "./D1";
import { CenaFala } from "./CenaFala";
import { ReelD1, REEL_TRANS } from "./ReelD1";
import { getAudioDuration } from "./lib/getAudioDuration";

const FPS = 30;

// Configuração do reel "vivo" (4 cenas com personagem por IA).
const REEL_CENAS = [
  { video: "chars/Dentinho/video/scene-0_9x16.mp4", audio: "voiceover/d1/scene-0.mp3", durSrc: "voiceover/d1/scene-0.mp3",
    phrases: [{ t: "Tem gente procurando dentista no seu bairro", from: 0 }, { t: "…e pode não ser você que aparece", from: 95 }] },
  { video: "chars/Dentinho/video/scene-1_9x16.mp4", audio: "voiceover/d1/scene-1.mp3", durSrc: "voiceover/d1/scene-1.mp3",
    phrases: [{ t: "No CuraDentes o paciente busca pelo bairro", from: 0 }, { t: "e acha quem está perto", from: 72 }] },
  { video: "chars/Dentinho/video/scene-2_9x16.mp4", audio: "voiceover/d1/scene-2.mp3", durSrc: "voiceover/d1/scene-2.mp3",
    phrases: [{ t: "Criar seu perfil é de graça", from: 0 }, { t: "durante o Beta", from: 50 }] },
  { video: "chars/Dentinho/video/scene-3_9x16.mp4", audio: "voiceover/d1/scene-3.mp3", durSrc: "chars/Dentinho/video/scene-3_9x16.mp4",
    phrases: [{ t: "Acesse nosso site", from: 0 }, { t: "curadentes.com.br", from: 55 }] },
];

const D1_AUDIO = [
  "voiceover/d1/scene-0.mp3",
  "voiceover/d1/scene-1.mp3",
  "voiceover/d1/scene-2.mp3",
  "voiceover/d1/scene-3.mp3",
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Composition
      id="ReelD1"
      component={ReelD1}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ cenas: [] as never[] }}
      calculateMetadata={async () => {
        const durs = await Promise.all(REEL_CENAS.map((c) => getAudioDuration(staticFile(c.durSrc))));
        const cenas = REEL_CENAS.map((c, i) => ({
          video: c.video, audio: c.audio, phrases: c.phrases, dur: Math.ceil(durs[i] * FPS),
        }));
        const total = cenas.reduce((a, c) => a + c.dur, 0); // corte seco (sem transições)
        return { durationInFrames: total, props: { cenas } };
      }}
    />
    <Composition
      id="S0"
      component={CenaFala}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{
        video: "chars/Dentinho/video/scene-0_9x16.mp4",
        audio: "voiceover/d1/scene-0.mp3",
        phrases: [
          { t: "Tem gente procurando dentista no seu bairro", from: 0 },
          { t: "…e pode não ser você que aparece", from: 95 },
        ],
      }}
      calculateMetadata={async () => {
        const d = await getAudioDuration(staticFile("voiceover/d1/scene-0.mp3"));
        return { durationInFrames: Math.ceil(d * FPS) };
      }}
    />
    <Composition
      id="S1"
      component={CenaFala}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{
        video: "chars/Dentinho/video/scene-1_9x16.mp4",
        audio: "voiceover/d1/scene-1.mp3",
        phrases: [
          { t: "No CuraDentes o paciente busca pelo bairro", from: 0 },
          { t: "e acha quem está perto", from: 72 },
        ],
      }}
      calculateMetadata={async () => {
        const d = await getAudioDuration(staticFile("voiceover/d1/scene-1.mp3"));
        return { durationInFrames: Math.ceil(d * FPS) };
      }}
    />
    <Composition
      id="S2"
      component={CenaFala}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{
        video: "chars/Dentinho/video/scene-2_9x16.mp4",
        audio: "voiceover/d1/scene-2.mp3",
        phrases: [
          { t: "Criar seu perfil é de graça", from: 0 },
          { t: "durante o Beta", from: 50 },
        ],
      }}
      calculateMetadata={async () => {
        const d = await getAudioDuration(staticFile("voiceover/d1/scene-2.mp3"));
        return { durationInFrames: Math.ceil(d * FPS) };
      }}
    />
    <Composition
      id="D1"
      component={D1}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ sceneDurations: [] as number[] } satisfies D1Props}
      calculateMetadata={async () => {
        const durs = await Promise.all(D1_AUDIO.map((f) => getAudioDuration(staticFile(f))));
        // cauda curta (ritmo apertado); a transição cruza com a fala, sem silêncio
        const sceneDurations = durs.map((d) => Math.ceil(d * FPS) + TRANSITION_FRAMES);
        // respiro maior na última cena (CTA) para dar tempo de ler/clicar
        sceneDurations[sceneDurations.length - 1] += Math.round(1.1 * FPS);
        const total = sceneDurations.reduce((a, b) => a + b, 0) - (sceneDurations.length - 1) * TRANSITION_FRAMES;
        return { durationInFrames: total, props: { sceneDurations } };
      }}
    />
    </>
  );
};
