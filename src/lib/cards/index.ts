// Public surface for printable card generation. The actual draw logic
// lives in `npc.ts` (NPC small/big cards) and `net.ts` (NET architecture
// card); both reach for shared primitives in `shared.ts`.

export { downloadNpcCard, drawSmallCard, drawBigCard } from "./npc";
export type { CardSize } from "./npc";

export {
  downloadNetArchitectureCard,
  drawNetArchitectureCard,
} from "./net";
