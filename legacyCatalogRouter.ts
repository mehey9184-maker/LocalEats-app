import { Router, type Response } from "express";
import { pickupApiOrigin } from "./src/pickup/client";

// Legacy response aliases only. All publication decisions belong to the central API.
const SHOP_FIELDS = ["effective_is_active","availability_revision","availability_override_until","id","name","description","location","category","logo_url","rating","opening_time","closing_time","is_active","latitude","longitude","lat","lng","story"];
const MENU_FIELDS = ["id","shop_id","name","price","description","image_url","category","is_available","popularity_score","customizations","created_at"];
type Row = Record<string, unknown>;
class CatalogRateLimited extends Error {
  constructor(readonly retryAfter: string) { super("RATE_LIMITED"); }
}
function catalogFailure(res:Response,error:unknown):void {
  if(error instanceof CatalogRateLimited){res.set("Retry-After",error.retryAfter).status(429).json({success:false,code:"RATE_LIMITED",error:"Too many requests. Please try again later."});return;}
  res.status(503).json({success:false,error:"Catalog unavailable"});
}
function rows(value: unknown, fields: string[]): Row[] {
  if (!Array.isArray(value)) throw Error("INVALID_CATALOG");
  return value.map(row => {
    if (!row || typeof row !== "object" || Array.isArray(row) || typeof row.id !== "string" || !row.id) throw Error("INVALID_CATALOG_ROW");
    return Object.fromEntries(fields.filter(key => Object.hasOwn(row,key)).map(key => [key,row[key]]));
  });
}

export function makeLegacyCatalogRouter(originValue: string | undefined, transport: typeof fetch = fetch) {
  const router = Router();
  const read = async (path: string) => {
    // Explicit server-only config; never infer from Host, request headers, query or browser input.
    const origin = pickupApiOrigin(originValue || "", true);
    const response = await transport(origin + "/api/v1/catalog" + path, {
      method:"GET", redirect:"error", cache:"no-store", headers:{Accept:"application/json"},
      signal:AbortSignal.timeout(5000)
    });
    if (response.status === 404) return null;
    if (response.status === 429) {
      const seconds=response.headers.get("Retry-After") || "";
      throw new CatalogRateLimited(/^([1-9]|[1-5][0-9]|60)$/.test(seconds)?seconds:"60");
    }
    if (!response.ok) throw Error("CATALOG_UNAVAILABLE");
    const body = await response.json();
    if (!body || body.success !== true) throw Error("INVALID_CATALOG");
    return body;
  };
  router.get("/shops",async (_req,res) => {
    res.set("Cache-Control","no-store");
    try {
      const result = await read("/shops");
      res.json({success:true,shops:rows(result?.shops,SHOP_FIELDS)});
    } catch (error) { catalogFailure(res,error); }
  });
  router.get("/shops/:shopId/menu",async (req,res) => {
    res.set("Cache-Control","no-store");
    const id = req.params.shopId;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
      res.status(404).json({success:false,error:"Shop not found"}); return;
    }
    try {
      const result = await read("/shops/" + encodeURIComponent(id) + "/menu");
      if (!result) { res.status(404).json({success:false,error:"Shop not found"}); return; }
      const items = rows(result.menu_items,MENU_FIELDS);
      if (items.some(item => item.shop_id !== id)) throw Error("CATALOG_SHOP_MISMATCH");
      // Keep the legacy response key, including a genuine empty menu.
      res.json({success:true,items});
    } catch (error) { catalogFailure(res,error); }
  });
  return router;
}
