import { Skeleton } from "../../shared/ui/Skeleton";
import "./inspector.css";

export function InspectorSkeleton() {
  return (
    <aside className="inspector" aria-busy>
      <Skeleton width={80} height={10} />
      <div className="inspector__body">
        <Skeleton height={42} radius={8} />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} height={52} radius={8} />
        ))}
      </div>
    </aside>
  );
}
