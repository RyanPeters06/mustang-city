"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import MapView, { type BuildingTap, type MapHandle } from "./map/MapView";
import Intro from "./Intro";
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
import CrewPanel from "./crew/CrewPanel";
import BuildingDetail from "./buildings/BuildingDetail";
import ReplayBar from "./ReplayBar";
import AreaBanner from "./AreaBanner";
import Celebrations from "./Celebrations";
import TagButton from "./tags/TagButton";
import RadioPill from "./RadioPill";
import TransitChip from "./TransitChip";
import Wrapped from "./wrapped/Wrapped";
import { AnimatePresence } from "motion/react";
import TagDetail from "./tags/TagDetail";
import TagComposer from "./tags/TagComposer";
import DistrictDetail from "./districts/DistrictDetail";
import CollectibleDetail from "./CollectibleDetail";
import Radar from "./Radar";
import { startCollectibleWatch } from "@/lib/collectibleWatch";
import { COLLECTIBLES } from "@/lib/collectibles";
import { missionBySlug } from "@/lib/missions";
import { getLastFix } from "@/lib/location";
import { walkingRoute } from "@/lib/directions";
import { subscribeAccount } from "@/lib/account";
import { startPingLog } from "@/lib/pingLog";
import type { LngLat } from "@/lib/geo";
import type { FriendRow } from "@/app/api/friends/route";

const TITLES: Record<Exclude<Tab, "map">, string> = { missions: "Missions", crew: "Crew", profile: "Profile" };

// Deep-link params, read once: `?denied=uwo` (Auth0 callback) and `?add=<handle>` (friend QR code).
let paramsAtLoad: { denied: boolean; add: string | null } | undefined;
const readParams = () => {
  if (!paramsAtLoad) {
    const p = new URLSearchParams(window.location.search);
    paramsAtLoad = { denied: p.get("denied") === "uwo", add: p.get("add")?.toLowerCase().slice(0, 24) ?? null };
  }
  return paramsAtLoad;
};
const SERVER_PARAMS = { denied: false, add: null };
const noopSubscribe = () => () => {};

/** `key` is a mission slug or `bldg:<name>`. */
type Waypoint = { slug: string; distanceM: number; minutes: number };

export default function GameScreen() {
  const map = useRef<MapHandle | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [entered, setEntered] = useState(false);
  const onEntered = useCallback(() => setEntered(true), []);
  const [reason, setReason] = useState<string>();
  const params = useSyncExternalStore(noopSubscribe, readParams, () => SERVER_PARAMS);
  const [chosenTab, setTab] = useState<Tab | null>(null);
  const tab: Tab = chosenTab ?? (params.denied ? "profile" : params.add ? "crew" : "map");
  const [selected, setSelected] = useState<string | null>(null);
  const [building, setBuilding] = useState<BuildingTap | null>(null);
  const [waypoint, setWaypointState] = useState<Waypoint | null>(null);
  const [passed, setPassed] = useState<PassedInfo | null>(null);
  const [friendShown, setFriendShown] = useState<string | null>(null);
  /** Tag sheet: a tag id, "new" for the composer, or null. */
  const [tagSheet, setTagSheet] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [wrapped, setWrapped] = useState(false);
  const [collectible, setCollectible] = useState<string | null>(null);

  // Start the account check (and sync) as soon as the app opens.
  useEffect(() => {
    startPingLog();
    startCollectibleWatch();
    const off = subscribeAccount(() => {});
    return () => {
      off();
    };
  }, []);
  useEffect(() => {
    if (params.denied || params.add) window.history.replaceState(null, "", "/");
  }, [params]);

  const closeDistrict = useCallback(() => {
    setDistrict(null);
    map.current?.clearDistrict();
  }, []);

  const openMission = useCallback((slug: string) => {
    setDistrict(null);
    map.current?.clearDistrict();
    setTagSheet(null);
    setBuilding(null);
    map.current?.clearBuilding();
    setSelected(slug);
    map.current?.showMission(slug);
  }, []);

  const routeTo = useCallback(async (key: string | null, to?: LngLat) => {
    if (!key || !to) {
      map.current?.setRoute(null);
      setWaypointState(null);
      return;
    }
    const from = getLastFix()?.lngLat ?? map.current?.center();
    if (!from) return;
    try {
      const r = await walkingRoute(from, to);
      map.current?.setRoute(r.geometry);
      setWaypointState({ slug: key, distanceM: r.distanceM, minutes: r.minutes });
    } catch {
      setWaypointState(null);
    }
  }, []);

  const setMissionWaypoint = useCallback(
    (slug: string | null) => routeTo(slug, slug ? missionBySlug(slug)?.lngLat : undefined),
    [routeTo],
  );

  const toggleFriendMap = useCallback((f: FriendRow, cells: string[] | null) => {
    map.current?.showFriendArea(cells, f.accent);
    setFriendShown(cells ? f.handle : null);
    if (cells) setTab("map"); // close the sheet so the tinted area is visible
  }, []);

  const closeBuilding = useCallback(() => {
    setBuilding(null);
    map.current?.clearBuilding();
  }, []);

  const clearPassed = useCallback(() => setPassed(null), []);
  const sheetOpen = collectible !== null || district !== null || tagSheet !== null || selected !== null || building !== null || tab !== "map";
  const sheetTitle = collectible
    ? (COLLECTIBLES.find((c) => c.id === collectible)?.name ?? "Collectible")
    : district
    ? district
    : tagSheet
    ? tagSheet === "new"
      ? "Leave a tag"
      : "Tag"
    : selected
    ? (missionBySlug(selected)?.title ?? "")
    : building
      ? (building.name ?? "Campus building")
      : tab === "map"
        ? ""
        : TITLES[tab];
  const buildingKey = building ? `bldg:${building.name ?? building.center.join(",")}` : null;

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
        onBuildingTap={(b) => {
          setTagSheet(null);
          setSelected(null);
          setBuilding(b);
        }}
        onCollectibleTap={(id) => {
          setTagSheet(null);
          setSelected(null);
          setCollectible(id);
        }}
        onDistrictTap={(name) => {
          setTagSheet(null);
          setSelected(null);
          setDistrict(name);
        }}
        onTagTap={(id) => {
          setSelected(null);
          closeBuilding();
          setTagSheet(id);
        }}
      />
      <Hud visible={entered} />
      {entered && <Radar />}
      {mapState === "ready" && entered && !sheetOpen && (
        <>
          <LocationPrompt />
          <LocateButton map={map} />
          <TagButton onClick={() => setTagSheet("new")} />
          <RadioPill />
          <TransitChip />
          {friendShown && (
            <button
              type="button"
              onClick={() => {
                map.current?.showFriendArea(null);
                setFriendShown(null);
              }}
              className="glass absolute left-4 z-20 min-h-[44px] rounded-full px-4 text-[13px] font-bold text-ink"
              style={{ bottom: "calc(var(--safe-bottom) + 170px)" }}
            >
              Hide {friendShown.replace(/^demo\./, "")}&apos;s map ✕
            </button>
          )}
        </>
      )}

      <Sheet
        open={sheetOpen}
        title={sheetTitle}
        onClose={() => {
          if (collectible) setCollectible(null);
          else if (district) closeDistrict();
          else if (tagSheet) setTagSheet(null);
          else if (selected) setSelected(null);
          else if (building) closeBuilding();
          else setTab("map");
        }}
      >
        {collectible ? (
          <CollectibleDetail id={collectible} />
        ) : district ? (
          <DistrictDetail key={district} name={district} onOpenMission={openMission} />
        ) : tagSheet === "new" ? (
          <TagComposer onDone={setTagSheet} />
        ) : tagSheet ? (
          <TagDetail key={tagSheet} id={tagSheet} onClose={() => setTagSheet(null)} />
        ) : selected ? (
          <MissionDetail key={selected} slug={selected} waypoint={waypoint} onWaypoint={setMissionWaypoint} onPassed={setPassed} />
        ) : building ? (
          <BuildingDetail
            key={buildingKey}
            building={building}
            routed={waypoint?.slug === buildingKey ? waypoint : null}
            onWaypoint={(on) => routeTo(on ? buildingKey : null, building.center)}
            onOpenMission={openMission}
          />
        ) : tab === "missions" ? (
          <MissionList onOpen={openMission} />
        ) : tab === "profile" ? (
          <ProfilePanel denied={params.denied} onOpenMission={openMission} onOpenTag={setTagSheet} onOpenWrapped={() => setWrapped(true)} onOpenCollectible={setCollectible} onPlayReplay={() => setTab("map")} />
        ) : (
          <CrewPanel prefill={params.add} shownFriend={friendShown} onToggleMap={toggleFriendMap} />
        )}
      </Sheet>

      <TabBar
        visible={entered}
        active={tab}
        onChange={(t) => {
          setCollectible(null);
          closeDistrict();
          setTagSheet(null);
          setSelected(null);
          closeBuilding();
          setTab(t);
        }}
      />
      <Intro map={map} mapState={mapState} reason={reason} onDone={onEntered} />
      <AreaBanner />
      <ReplayBar />
      <Celebrations paused={passed !== null} />
      <MissionPassed info={passed} onDone={clearPassed} />
      <AnimatePresence>{wrapped && <Wrapped key="wrapped" onClose={() => setWrapped(false)} />}</AnimatePresence>
      <DemoPanel map={map} selected={selected} onPassed={setPassed} />
    </main>
  );
}
