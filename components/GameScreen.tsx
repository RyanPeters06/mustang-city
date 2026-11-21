"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import MapView, { type MapHandle } from "./map/MapView";
import LoadingScreen from "./map/LoadingScreen";
import Hud from "./Hud";
import TabBar, { type Tab } from "./TabBar";
import Sheet from "./Sheet";
import LocationPrompt from "./LocationPrompt";
import ProfilePanel from "./ProfilePanel";
import DemoPanel from "./DemoPanel";

const TITLES: Record<Exclude<Tab, "map">, string> = { missions: "Missions", crew: "Crew", profile: "Profile" };

// `?denied=uwo` is set by the Auth0 callback when a non-Western account signs in. Read once.
let deniedAtLoad: boolean | undefined;
const readDenied = () =>
  (deniedAtLoad ??= new URLSearchParams(window.location.search).get("denied") === "uwo");
const noopSubscribe = () => () => {};

export default function GameScreen() {
  const map = useRef<MapHandle | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [reason, setReason] = useState<string>();
  const denied = useSyncExternalStore(noopSubscribe, readDenied, () => false);
  const [chosenTab, setTab] = useState<Tab | null>(null);
  const tab: Tab = chosenTab ?? (denied ? "profile" : "map");

  useEffect(() => {
    if (denied) window.history.replaceState(null, "", "/");
  }, [denied]);

  return (
    <main className="absolute inset-0">
      <MapView
        ref={map}
        onReady={() => setMapState("ready")}
        onUnavailable={(r) => {
          setReason(r);
          setMapState("unavailable");
        }}
      />
      <Hud />
      {mapState === "ready" && <LocationPrompt />}

      <Sheet open={tab !== "map"} title={tab === "map" ? "" : TITLES[tab]} onClose={() => setTab("map")}>
        {tab === "profile" ? (
          <ProfilePanel denied={denied} />
        ) : (
          <p className="pb-4 text-[15px] text-ink/70">
            {tab === "missions"
              ? "The Goose is lining up jobs across Forest State. Missions drop tomorrow."
              : "Crews and friends are coming soon."}
          </p>
        )}
      </Sheet>

      <TabBar active={tab} onChange={setTab} />
      <LoadingScreen state={mapState} reason={reason} />
      <DemoPanel map={map} />
    </main>
  );
}
