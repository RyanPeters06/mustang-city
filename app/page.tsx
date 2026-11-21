import GameScreen from "@/components/GameScreen";
import { coverArt } from "@/lib/brandAssets";

export default function Home() {
  // Read at build time: drop art into public/cover/ and the loading screen picks it up.
  return <GameScreen cover={coverArt()} />;
}
