import { Skeleton } from "../../shared/ui/Skeleton";
import "./results.css";

export function ResultsSkeleton() {
  return (
    <section className="results" aria-busy>
      <div className="results__skeleton">
        <Skeleton width={260} height={24} />
        <Skeleton height={120} radius={10} />
      </div>
    </section>
  );
}
