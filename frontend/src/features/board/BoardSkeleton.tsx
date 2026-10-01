import { Skeleton } from "../../shared/ui/Skeleton";
import "./board.css";

// Placeholder parts laid out on the mat so the loading state reads as a circuit
// canvas rather than a blank rectangle.
const PARTS = [
  { x: "16%", y: "22%", w: 128, h: 60, pins: 3 },
  { x: "45%", y: "38%", w: 160, h: 78, pins: 4 },
  { x: "72%", y: "24%", w: 108, h: 56, pins: 2 },
  { x: "30%", y: "66%", w: 132, h: 54, pins: 3 },
  { x: "64%", y: "64%", w: 144, h: 66, pins: 4 },
];

export function BoardSkeleton() {
  return (
    <section className="board board-skeleton" aria-busy aria-label="Loading canvas">
      <div className="board-skeleton__toolbar">
        <Skeleton width={120} height={32} />
        <Skeleton width={70} height={32} />
        <Skeleton width={140} height={32} />
        <span className="board-skeleton__spacer" />
        <Skeleton width={90} height={32} />
      </div>
      <div className="board-skeleton__mat">
        {PARTS.map((part, i) => (
          <div
            key={i}
            className="board-skeleton__part"
            style={{ left: part.x, top: part.y, width: part.w, height: part.h }}
          >
            <Skeleton width="100%" height="100%" radius={10} />
            <div className="board-skeleton__pins">
              {Array.from({ length: part.pins }).map((_, p) => (
                <span key={p} className="board-skeleton__pin" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
