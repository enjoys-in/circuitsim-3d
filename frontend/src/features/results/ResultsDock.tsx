import { lazy, Suspense, useState } from "react";
import { cx } from "../../shared/lib/format";
import { Skeleton } from "../../shared/ui/Skeleton";
import { Tabs, type TabItem } from "../../shared/ui/Tabs";
import { useSimulation } from "../simulation/SimulationContext";
import { OverviewPanel } from "./OverviewPanel";
import { PlaybackBar } from "./PlaybackBar";
import { SerialConsole } from "./SerialConsole";
import "./results.css";

const WaveformPanel = lazy(() => import("./WaveformPanel"));

type TabKey = "overview" | "waves" | "serial";

export default function ResultsDock() {
  const { result, error, stale, status, live, playback } = useSimulation();
  const [tab, setTab] = useState<TabKey>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const updating = result !== null && (status === "running" || (stale && live));

  const items: TabItem<TabKey>[] = [
    { key: "overview", label: "Overview", badge: result?.warnings.length || undefined },
    { key: "waves", label: "Waveforms", badge: result?.series.length || undefined },
    { key: "serial", label: "Serial", badge: result?.log.length || undefined },
  ];

  return (
    <section className={collapsed ? "results results--collapsed" : "results"}>
      <Tabs
        items={items}
        active={tab}
        onChange={(key) => {
          setTab(key);
          setCollapsed(false);
        }}
        trailing={
          <>
            {updating && <span className="results__updating">↻ updating…</span>}
            {result && <PlaybackBar result={result} playback={playback} />}
            <button type="button" className="results__collapse" onClick={() => setCollapsed((c) => !c)}>
              {collapsed ? "▴" : "▾"}
            </button>
          </>
        }
      />
      <div
        className={cx(
          "results__body",
          collapsed && "results__body--collapsed",
          updating && "results__body--updating",
        )}
        aria-hidden={collapsed}
      >
        {tab === "overview" && <OverviewPanel result={result} error={error} />}
        {tab === "waves" && result && (
          <Suspense fallback={<Skeleton height={160} radius={10} />}>
            <WaveformPanel result={result} cursor={playback.frame} />
          </Suspense>
        )}
        {tab === "waves" && !result && <OverviewPanel result={null} error={error} />}
        {tab === "serial" && <SerialConsole log={result?.log ?? []} />}
      </div>
    </section>
  );
}
