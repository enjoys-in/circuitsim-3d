import { cx } from "../../shared/lib/format";
import { Button } from "../../shared/ui/Button";
import { NumberInput } from "../../shared/ui/NumberInput";
import { usePcb } from "./PcbContext";
import { LAYER_COLOR, type Layer } from "./model/pcbTypes";

const LAYERS: Layer[] = ["top", "bottom"];

export type PcbViewMode = "2d" | "3d";

interface Props {
  mode: PcbViewMode;
  onMode: (mode: PcbViewMode) => void;
}

export function PcbToolbar({ mode, onMode }: Props) {
  const pcb = usePcb();
  const errors = pcb.drc.filter((v) => v.kind !== "unrouted").length;
  const unrouted = pcb.netCount - pcb.connectivity.routedNets.size;
  const selected = pcb.selectedId;

  return (
    <div className="pcb-toolbar">
      <div className="segmented">
        {(["2d", "3d"] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={cx("segmented__item", mode === m && "segmented__item--active")}
            onClick={() => onMode(m)}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="pcb-toolbar__group">
        <span className="pcb-toolbar__label">Layer</span>
        <div className="segmented">
          {LAYERS.map((layer) => (
            <button
              key={layer}
              type="button"
              className={cx("segmented__item", pcb.activeLayer === layer && "segmented__item--active")}
              onClick={() => pcb.setActiveLayer(layer)}
            >
              <span className="pcb-swatch" style={{ background: LAYER_COLOR[layer] }} />
              {layer}
            </button>
          ))}
        </div>
      </div>

      <div className="pcb-toolbar__group">
        {LAYERS.map((layer) => (
          <label key={layer} className="pcb-toolbar__check">
            <input type="checkbox" checked={pcb.visible[layer]} onChange={() => pcb.toggleVisible(layer)} />
            show {layer}
          </label>
        ))}
      </div>

      <NumberInput
        label="Trace"
        suffix="px"
        value={pcb.traceWidth}
        min={2}
        max={16}
        onCommit={pcb.setTraceWidth}
      />

      <div className="pcb-toolbar__group">
        <span className="pcb-toolbar__label">Part</span>
        <Button size="sm" disabled={!selected} onClick={() => selected && pcb.rotateComponent(selected)}>
          ⟳ Rotate
        </Button>
        <Button size="sm" disabled={!selected} onClick={() => selected && pcb.flipComponent(selected)}>
          ⇋ Flip
        </Button>
      </div>

      <div className="pcb-toolbar__end">
        {pcb.routing && <span className="pcb-hint">routing — click pads/points, V = via, Esc = cancel</span>}
        {!pcb.routing && selected && <span className="pcb-hint">part selected — R rotate, F flip, drag to move</span>}
        <span className={cx("status-badge", unrouted === 0 ? "status-badge--ok" : "status-badge--stale")}>
          {unrouted === 0 ? "fully routed" : `${unrouted} unrouted`}
        </span>
        <span className={cx("status-badge", errors === 0 ? "status-badge--ok" : "status-badge--error")}>
          DRC {errors === 0 ? "clean" : `${errors}`}
        </span>
        <Button size="sm" onClick={pcb.autoArrange}>
          Auto-place
        </Button>
        <Button size="sm" onClick={pcb.clearRoutes}>
          Clear routes
        </Button>
      </div>
    </div>
  );
}
