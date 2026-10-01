import { useEffect, useState } from "react";
import { Button } from "../../shared/ui/Button";
import { EmptyState } from "../../shared/ui/EmptyState";
import { Sheet } from "../../shared/ui/Sheet";
import { Skeleton } from "../../shared/ui/Skeleton";
import { errorMessage, vendorService } from "../../services";
import type { VendorCategory, VendorProduct, VendorProductPage } from "../../services/vendor.service";
import { useCatalog } from "../catalog/CatalogContext";
import "./vendor.css";

const PAGE_SIZE = 24;

export function VendorSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { reload } = useCatalog();
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<VendorProductPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState<string | null>(null);

  // Load the category list once the sheet opens.
  useEffect(() => {
    if (!open) return;
    vendorService
      .categories()
      .then((res) => {
        setAvailable(res.available);
        setCategories(res.categories);
      })
      .catch(() => setAvailable(false));
  }, [open]);

  // Fetch products on open / filter / page change (debounced for the search box).
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      vendorService
        .products({ category, q: query, page, pageSize: PAGE_SIZE }, { signal: controller.signal })
        .then(setResult)
        .catch((e) => {
          if (!controller.signal.aborted) setResult(null);
          void e;
        })
        .finally(() => !controller.signal.aborted && setLoading(false));
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, category, query, page]);

  const pickCategory = (name: string | null) => {
    setCategory(name);
    setPage(1);
  };

  const doImport = async (product: VendorProduct) => {
    setImporting(product.id);
    try {
      const def = await vendorService.import(product.id);
      setImported((prev) => ({ ...prev, [product.id]: true }));
      reload(); // refresh the catalog so the new part shows in the palette
      void def;
    } catch (e) {
      alert(`Import failed: ${errorMessage(e)}`);
    } finally {
      setImporting(null);
    }
  };

  return (
    <Sheet open={open} title="Import from store" onClose={onClose} actions={<span className="sheet__soon">on-demand catalog</span>}>
      {available === false ? (
        <EmptyState title="Store catalog not available">
          No parts to browse yet — the catalog hasn’t been set up on the server.
        </EmptyState>
      ) : (
        <div className="vendor">
          <aside className="vendor__cats">
            <button
              type="button"
              className={`vendor__cat ${category === null ? "vendor__cat--active" : ""}`}
              onClick={() => pickCategory(null)}
            >
              All categories
            </button>
            {categories.map((c) => (
              <button
                key={c.name}
                type="button"
                className={`vendor__cat ${category === c.name ? "vendor__cat--active" : ""}`}
                onClick={() => pickCategory(c.name)}
              >
                <span className="vendor__cat-name">{c.name}</span>
                <span className="vendor__cat-count">{c.count}</span>
              </button>
            ))}
          </aside>

          <section className="vendor__main">
            <div className="vendor__bar">
              <input
                className="vendor__search"
                type="search"
                placeholder="Search products…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
              {result && (
                <span className="vendor__count">
                  {result.total.toLocaleString()} result{result.total === 1 ? "" : "s"}
                  {category ? ` in ${category}` : ""}
                </span>
              )}
            </div>

            {loading && !result ? (
              <div className="vendor__grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height={132} radius={10} />
                ))}
              </div>
            ) : result && result.items.length === 0 ? (
              <EmptyState title="No products match">Try another category or search.</EmptyState>
            ) : (
              <div className="vendor__grid" aria-busy={loading}>
                {result?.items.map((p) => (
                  <article key={p.id} className="vendor-card">
                    <h4 className="vendor-card__name" title={p.name}>{p.name}</h4>
                    <div className="vendor-card__meta">
                      {p.categories[0] && <span className="vendor-card__cat">{p.categories[0]}</span>}
                    </div>
                    <div className="vendor-card__actions">
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={importing === p.id || imported[p.id]}
                        onClick={() => doImport(p)}
                      >
                        {imported[p.id] ? "Imported ✓" : importing === p.id ? "Importing…" : "Import"}
                      </Button>
                      {p.url && (
                        <a className="vendor-card__link" href={p.url} target="_blank" rel="noreferrer noopener">
                          View ↗
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {result && result.pages > 1 && (
              <div className="vendor__pager">
                <Button size="sm" disabled={page <= 1} onClick={() => setPage((n) => Math.max(1, n - 1))}>
                  ‹ Prev
                </Button>
                <span className="vendor__pageinfo">
                  Page {result.page} / {result.pages}
                </span>
                <Button size="sm" disabled={page >= result.pages} onClick={() => setPage((n) => n + 1)}>
                  Next ›
                </Button>
              </div>
            )}
          </section>
        </div>
      )}
    </Sheet>
  );
}
