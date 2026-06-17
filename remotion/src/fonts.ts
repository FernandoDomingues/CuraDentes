import { loadFont } from "@remotion/fonts";
import { staticFile, delayRender, continueRender } from "remotion";

// Fonte própria da marca (woff2 servidos também pelo site).
export const BRAND_FONT = "CuraDentes";

const handle = delayRender("carregando fonte CuraDentes");

Promise.all([
  loadFont({ family: BRAND_FONT, url: staticFile("fonts/CuraDentes-Bold.woff2"), weight: "700" }),
  loadFont({ family: BRAND_FONT, url: staticFile("fonts/CuraDentes-Regular.woff2"), weight: "400" }),
  loadFont({ family: BRAND_FONT, url: staticFile("fonts/CuraDentes-Light.woff2"), weight: "300" }),
])
  .then(() => continueRender(handle))
  .catch(() => continueRender(handle));
