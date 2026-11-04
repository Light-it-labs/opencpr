import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import satori, { type Font, type FontWeight } from "satori";
import { html } from "satori-html";

const CARD_WIDTH = 800;

const require = createRequire(import.meta.url);

/**
 * Satori reads only woff, ttf and otf, and no variable fonts, so the static
 * woff files are loaded rather than the woff2 the packages default to. The
 * latin subset covers the card's copy.
 */
const loadFont = (
  family: "Gabarito" | "Funnel Sans",
  weight: FontWeight,
): Font => {
  const slug = family.toLowerCase().replace(" ", "-");
  return {
    name: family,
    weight,
    style: "normal",
    data: readFileSync(
      require.resolve(
        `@fontsource/${slug}/files/${slug}-latin-${weight}-normal.woff`,
      ),
    ),
  };
};

const FONTS: Font[] = [
  loadFont("Gabarito", 400),
  loadFont("Gabarito", 500),
  loadFont("Gabarito", 600),
  loadFont("Gabarito", 700),
  loadFont("Funnel Sans", 400),
  loadFont("Funnel Sans", 500),
  loadFont("Funnel Sans", 600),
];

export const renderResultsCard = async (markup: string): Promise<Buffer> => {
  const svg = await satori(html(markup), { width: CARD_WIDTH, fonts: FONTS });
  return new Resvg(svg).render().asPng();
};
