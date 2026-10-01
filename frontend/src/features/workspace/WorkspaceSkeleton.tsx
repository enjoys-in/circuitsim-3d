import { BoardSkeleton } from "../board/BoardSkeleton";
import { InspectorSkeleton } from "../inspector/InspectorSkeleton";
import { ResultsSkeleton } from "../results/ResultsSkeleton";
import "./workspace.css";

export function WorkspaceSkeleton() {
  return (
    <div className="workspace" aria-busy>
      <div className="workspace__main">
        <BoardSkeleton />
        <ResultsSkeleton />
      </div>
      <InspectorSkeleton />
    </div>
  );
}
