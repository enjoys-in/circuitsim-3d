import { Skeleton } from "../../shared/ui/Skeleton";

const CARDS = 12;

export function PaletteSkeleton() {
  return (
    <div className="palette__groups" aria-busy>
      <Skeleton width={90} height={10} className="palette__skeleton-heading" />
      <div className="palette__grid">
        {Array.from({ length: CARDS }, (_, i) => (
          <Skeleton key={i} height={92} radius={10} />
        ))}
      </div>
    </div>
  );
}
