"""Scrape product + sensor data from robu.in.

robu.in is a headless WooCommerce storefront. Its `robots.txt` blocks `/api/*`
for bots but explicitly *allows* the GraphQL proxy at `/api/proxy/graphql/`,
which is the same endpoint the site itself uses to render category pages. We use
that endpoint (the `CategoryProducts` operation) to page through every category.

Output (JSON, under --out, default backend/data/robu/):
  categories.json    every category node discovered (with parent + top-level slug)
  products.json      all products, de-duplicated by product id

A top-level parent query does NOT reliably aggregate every descendant product, so
by default we walk the full category tree and scrape each node, deduping globally.
Use --no-recurse to scrape only top-level slugs (faster, but misses deep products).

Only public catalog listing data is collected (name, url, sku, price, stock,
image, leaf categories). Product short descriptions are NOT part of the listing
endpoint; fetching them needs a separate per-product pass (see --help notes).

Usage:
  python scripts/scrape_robu.py                 # full recursive scrape, all categories
  python scripts/scrape_robu.py --max-pages 2   # quick validation run
  python scripts/scrape_robu.py --categories sensor-modules,electronic-components
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ENDPOINT = "https://robu.in/api/proxy/graphql/"
PRODUCT_URL = "https://robu.in/product/{slug}/"

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (compatible; catalog-importer/1.0)",
    "Origin": "https://robu.in",
    "Referer": "https://robu.in/",
}

# Top-level categories that are not real product listings (services / meta) and
# are skipped by default. Everything else returned by homeAllCategories is scraped.
SKIP_CATEGORIES = {"services", "robu-services"}

HOME_CATEGORIES_QUERY = (
    "{ homeAllCategories { data { homeAllCategories { id name slug } } } }"
)

CATEGORY_PRODUCTS_QUERY = """
query CategoryProducts($slug: String!, $limit: Int, $page: Int, $sort: String!, $search: String!) {
  visibleMenuCategories(parent: true, limit: $limit, slug: $slug, page: $page, sort: $sort, search: $search) {
    status
    message
    data {
      products {
        id
        sku
        name
        slug
        price
        sale_price
        images
        in_stock
        categories
      }
      pagination { current_page per_page total last_page }
    }
  }
}
"""

# Returns a category's direct child categories. A top-level parent query does NOT
# reliably aggregate every descendant product, so we walk the tree and scrape each
# node, deduping products globally by id.
CATEGORY_CHILDREN_QUERY = """
query CategoryChildren($slug: String!) {
  visibleMenuCategories(slug: $slug, parent: true, limit: 1, page: 1, sort: "latest", search: "") {
    data {
      has_children
      children { id name slug products_count }
    }
  }
}
"""


class GraphQLError(RuntimeError):
    pass


def gql(query: str, variables: dict | None = None, *, tries: int = 5, base_delay: float = 2.0) -> dict:
    """POST a GraphQL query with retry/backoff on transient (5xx / network) errors."""
    payload = json.dumps({"query": query, "variables": variables or {}}).encode()
    last_err: Exception | None = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(ENDPOINT, data=payload, headers=HEADERS, method="POST")
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = json.loads(resp.read().decode())
            if body.get("errors"):
                raise GraphQLError(str(body["errors"])[:300])
            return body
        except urllib.error.HTTPError as exc:
            last_err = exc
            if exc.code < 500:  # client error: don't retry
                raise
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, GraphQLError) as exc:
            last_err = exc
        time.sleep(base_delay * (attempt + 1))
    raise GraphQLError(f"request failed after {tries} tries: {last_err}")


def fetch_categories() -> list[dict]:
    data = gql(HOME_CATEGORIES_QUERY)["data"]["homeAllCategories"]["data"]["homeAllCategories"]
    return [c for c in data if c["slug"] not in SKIP_CATEGORIES]


def fetch_children(slug: str) -> list[dict]:
    try:
        nodes = gql(CATEGORY_CHILDREN_QUERY, {"slug": slug})["data"]["visibleMenuCategories"]["data"]
    except GraphQLError:
        return []
    if not nodes:
        return []
    return nodes[0].get("children") or []


def collect_category_tree(top: list[dict], *, max_depth: int = 6) -> list[dict]:
    """BFS the whole category tree; return every node with its top-level ancestor."""
    ordered: list[dict] = []
    seen: set[str] = set()
    # queue items: (node, top_level_slug, parent_slug, depth)
    queue = [(c, c["slug"], None, 0) for c in top]
    while queue:
        node, top_slug, parent, depth = queue.pop(0)
        slug = node["slug"]
        if slug in seen:
            continue
        seen.add(slug)
        ordered.append(
            {
                "id": node.get("id"),
                "name": node.get("name"),
                "slug": slug,
                "parent": parent,
                "top_level": top_slug,
                "products_count": node.get("products_count"),
            }
        )
        if depth >= max_depth:
            continue
        for child in fetch_children(slug):
            if child["slug"] not in seen:
                queue.append((child, top_slug, slug, depth + 1))
    return ordered


def normalize(raw: dict, source_slug: str, top_slug: str) -> dict:
    images = raw.get("images") or []
    return {
        "id": str(raw["id"]),
        "sku": raw.get("sku"),
        "name": raw.get("name"),
        "slug": raw.get("slug"),
        "url": PRODUCT_URL.format(slug=raw.get("slug")) if raw.get("slug") else None,
        "price": raw.get("price"),
        "sale_price": raw.get("sale_price"),
        "in_stock": raw.get("in_stock"),
        "image": images[0] if images else None,
        "categories": raw.get("categories") or [],
        "source_categories": [source_slug],
        "top_categories": [top_slug],
    }


def scrape_category(slug: str, top_slug: str, *, limit: int, delay: float, max_pages: int) -> list[dict]:
    products: list[dict] = []
    page = 1
    last_page = 1
    while page <= last_page:
        body = gql(
            CATEGORY_PRODUCTS_QUERY,
            {"slug": slug, "limit": limit, "page": page, "sort": "latest", "search": ""},
        )
        nodes = body["data"]["visibleMenuCategories"]["data"]
        if not nodes:
            break
        node = nodes[0]
        pagination = node.get("pagination") or {}
        last_page = int(pagination.get("last_page") or 1)
        if max_pages:
            last_page = min(last_page, max_pages)
        batch = node.get("products") or []
        products.extend(normalize(p, slug, top_slug) for p in batch)
        if not batch:
            break
        page += 1
        if page <= last_page:
            time.sleep(delay)
    return products


def merge_product(merged: dict[str, dict], prod: dict) -> None:
    existing = merged.get(prod["id"])
    if existing is None:
        merged[prod["id"]] = dict(prod)
        return
    for key in ("source_categories", "top_categories", "categories"):
        for val in prod.get(key, []):
            if val not in existing[key]:
                existing[key].append(val)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Scrape robu.in catalog via its public GraphQL proxy.")
    parser.add_argument("--out", default=str(Path(__file__).resolve().parents[1] / "data" / "robu"))
    parser.add_argument("--limit", type=int, default=24, help="page size (robu caps ~24; higher 504s)")
    parser.add_argument("--delay", type=float, default=0.4, help="seconds between page requests")
    parser.add_argument("--max-pages", type=int, default=0, help="cap pages per category (0 = all)")
    parser.add_argument("--categories", default="", help="comma-separated top-level slugs (default: all)")
    parser.add_argument(
        "--no-recurse",
        action="store_true",
        help="scrape only the given/top-level slugs (faster but misses deep products)",
    )
    args = parser.parse_args(argv)

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    top = fetch_categories()
    if args.categories.strip():
        wanted = {s.strip() for s in args.categories.split(",") if s.strip()}
        by_slug = {c["slug"]: c for c in top}
        top = [by_slug.get(s, {"id": None, "name": s, "slug": s}) for s in wanted]

    if args.no_recurse:
        nodes = [{"id": c.get("id"), "name": c["name"], "slug": c["slug"], "parent": None,
                  "top_level": c["slug"], "products_count": None} for c in top]
    else:
        print(f"Building category tree from {len(top)} top-level categories...")
        nodes = collect_category_tree(top)

    (out_dir / "categories.json").write_text(
        json.dumps(nodes, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Scraping {len(nodes)} category nodes -> {out_dir}")

    merged: dict[str, dict] = {}
    for i, node in enumerate(nodes, 1):
        slug, top_slug = node["slug"], node["top_level"]
        try:
            products = scrape_category(
                slug, top_slug, limit=args.limit, delay=args.delay, max_pages=args.max_pages
            )
        except GraphQLError as exc:
            print(f"  !! [{i}/{len(nodes)}] skipped {slug}: {exc}", file=sys.stderr)
            continue
        for prod in products:
            merge_product(merged, prod)
        print(f"  [{i}/{len(nodes)}] {slug}: +{len(products)} ({len(merged)} unique so far)")

    products_list = list(merged.values())
    (out_dir / "products.json").write_text(
        json.dumps(products_list, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"\nDone. {len(products_list)} unique products across {len(nodes)} category nodes -> {out_dir / 'products.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
