"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import MapView, { type MapHandle } from "./map/MapView";
import LoadingScreen from "./map/LoadingScreen";
import Hud from "./Hud";
import TabBar, { type Tab } from "./TabBar";
import Sheet from "./Sheet";
import LocationPrompt from "./LocationPrompt";
import ProfilePanel from "./ProfilePanel";
import DemoPanel from "./DemoPanel";
import LocateButton from "./LocateButton";
import MissionList from "./missions/MissionList";
import MissionDetail, { type PassedInfo } from "./missions/MissionDetail";
import MissionPassed from "./missions/MissionPassed";
import { missionBySlug } from "@/lib/missions";
import { getLastFix } from "@/lib/location";
import { walkingRoute } from "@/lib/directions";

const TITLES: Record<Exclude<Tab, "map">, string> = { missions: "Missions", crew: "Crew", profile: "Profile" };

// `?denied=uwo` is set by the Auth0 callback when a non-Western account signs in. Read once.
let deniedAtLoad: boolean | undefined;
const readDenied = () => (deniedAtLoad ??= new URLSearchParams(window.location.search).get("denied") === "uwo");
const noopSubscribe = () => () => {};

type Waypoint = { slug: string; distanceM: number; minutes: number };

export default function GameScreen() {
  const map = useRef<MapHandle | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [reason, setReason] = useState<string>();
  const denied = useSyncExternalStore(noopSubscribe, readDenied, () => false);
  const [chosenTab, setTab] = useState<Tab | null>(null);
  const tab: Tab = chosenTab ?? (denied ? "profile" : "map");
  const [selected, setSelected] = useState<string | null>(null);
  const [waypoint, setWaypointState] = useState<Waypoint | null>(null);
  const [passed, setPassed] = useState<PassedInfo | null>(null);

  useEffect(() => {
    if (denied) window.history.replaceState(null, "", "/");
  }, [denied]);

  const openMission = useCallback((slug: string) => {
    setSelected(slug);
    map.current?.showMission(slug);
  }, []);

  const setWaypoint = useCallback(async (slug: string | null) => {
    if (!slug) {
      map.current?.setRoute(null);
      setWaypointState(null);
      return;
    }
    const m = missionBySlug(slug);
    const from = getLastFix()?.lngLat ?? map.current?.center();
    if (!m || !from) return;
    try {
      const r = await walkingRoute(from, m.lngLat);
      map.current?.setRoute(r.geometry);
      setWaypointState({ slug, distanceM: r.distanceM, minutes: r.minutes });
    } catch {
      setWaypointState(null);
    }
  }, []);

  const clearPassed = useCallback(() => setPassed(null), []);
  const sheetOpen = selected !== null || tab !== "map";
  const sheetTitle = selected ? (missionBySlug(selected)?.title ?? "") : tab === "map" ? "" : TITLES[tab];

  return (
    <main className="absolute inset-0">
      <MapView
        ref={map}
        onReady={() => setMapState("ready")}
        onUnavailable={(r) => {
          setReason(r);
          setMapState("unavailable");
        }}
        onMissionTap={openMission}
      />
      <Hud />
      {mapState === "ready" && !sheetOpen && (
        <>
          <LocationPrompt />
          <LocateButton map={map} />
        </>
      )}

      <Sheet
        open={sheetOpen}
        title={sheetTitle}
        onClose={() => (selected ? setSelected(null) : setTab("map"))}
      >
        {selected ? (
          <MissionDetail key={selected} slug={selected} waypoint={waypoint} onWaypoint={setWaypoint} onPassed={setPassed} />
        ) : tab === "missions" ? (
          <MissionList onOpen={openMission} />
        ) : tab === "profile" ? (
          <ProfilePanel denied={denied} onOpenMission={openMission} />
        ) : (
          <p className="pb-4 text-[15px] text-ink/70">Crews, friends and faculty turf are coming soon.</p>
        )}
      </Sheet>

      <TabBar
        active={tab}
        onChange={(t) => {
          setSelected(null);
          setTab(t);
        }}
      />
      <LoadingScreen state={mapState} reason={reason} />
      <MissionPassed info={passed} onDone={clearPassed} />
      <DemoPanel map={map} selected={selected} onPassed={setPassed} />
    </main>
  );
}
