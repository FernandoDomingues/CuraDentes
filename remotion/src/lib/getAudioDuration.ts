import { Input, ALL_FORMATS, UrlSource } from "mediabunny";

// Duração de um áudio (segundos) — funciona no Studio (browser) e no render (Node).
export const getAudioDuration = async (src: string) => {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(src, {
      getRetryDelay: () => null,
    }),
  });
  return input.computeDuration();
};
