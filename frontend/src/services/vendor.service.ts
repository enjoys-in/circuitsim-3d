import type { ComponentDef } from "../domain";
import type { IHttpClient, RequestOptions } from "./http";

export interface VendorCategory {
  name: string;
  count: number;
}

export interface VendorCategories {
  available: boolean;
  total: number;
  categories: VendorCategory[];
}

export interface VendorProduct {
  id: string;
  name: string;
  sku?: string | null;
  slug?: string | null;
  url?: string | null;
  price?: number | null;
  sale_price?: number | null;
  in_stock?: boolean | null;
  image?: string | null;
  categories: string[];
}

export interface VendorProductPage {
  items: VendorProduct[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface VendorQuery {
  category?: string | null;
  q?: string | null;
  page?: number;
  pageSize?: number;
}

export class VendorService {
  constructor(private readonly http: IHttpClient) {}

  categories(request?: RequestOptions): Promise<VendorCategories> {
    return this.http.get<VendorCategories>("/vendor/categories", request);
  }

  products(query: VendorQuery, request?: RequestOptions): Promise<VendorProductPage> {
    const params = new URLSearchParams();
    if (query.category) params.set("category", query.category);
    if (query.q) params.set("q", query.q);
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("page_size", String(query.pageSize));
    const qs = params.toString();
    return this.http.get<VendorProductPage>(`/vendor/products${qs ? `?${qs}` : ""}`, request);
  }

  import(id: string, request?: RequestOptions): Promise<ComponentDef> {
    return this.http.post<ComponentDef>("/vendor/import", { id }, request);
  }
}
