import { loadFont as loadNotoSerifKR } from "@remotion/google-fonts/NotoSerifKR";

// Available weights for Noto Serif KR: 200, 300, 400, 500, 600, 700.
// (No 900 — use 700 + letter-spacing for max visual weight.)
export const { fontFamily: NOTO_SERIF_KR } = loadNotoSerifKR("normal", {
  weights: ["400", "700"],
});
