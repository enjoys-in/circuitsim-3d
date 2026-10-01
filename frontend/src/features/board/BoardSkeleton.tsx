import { Skeleton } from "../../shared/ui/Skeleton";
import "./board.css";

export function BoardSkeleton() {
  return (
    <section className="board board-skeleton" aria-busy>
      <div className="board-skeleton__toolbar">
        <Skeleton width={120} height={32} />
        <Skeleton width={70} height={32} />
        <Skeleton width={140} height={32} />
      </div>
      <div className="board-skeleton__mat" />
    </section>
  );
}
