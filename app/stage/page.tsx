import type { Metadata } from "next";
import Stage from "@/components/stage/Stage";

export const metadata: Metadata = { title: "Mustang City · Live" };

/** Big-screen mirror for the judging hall: open next to the app and it follows the player's fog live. */
export default function StagePage() {
  return <Stage />;
}
