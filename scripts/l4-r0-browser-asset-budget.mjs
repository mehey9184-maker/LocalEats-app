// L4-R0 predeploy source metrics. CI-only; NO network, DB or account access.
// A static compressed-asset report is not a live RTT, GPS, or server benchmark.
import {readdirSync,readFileSync,mkdirSync,writeFileSync,statSync} from "node:fs";
import {join} from "node:path";
import {gzipSync} from "node:zlib";
import {createHash} from "node:crypto";

const root="dist/assets";
const entries=readdirSync(root,{withFileTypes:true}).filter(x=>x.isFile()&&/\.(js|css)$/.test(x.name));
if(!entries.length)throw new Error("No Customer Vite browser assets found; don't claim build readiness");
const report={scope:"Customer browser assets only — no real user data, no production speed claims",
  generatedAt:new Date().toISOString(),customerSha:process.env.CUSTOMER_SOURCE_SHA||"unverified",
  assets:[],totalJsGzipBytes:0,totalCssGzipBytes:0,largestJsGzipBytes:0,
  hardCeilings:{largestJsGzipBytes:5*1024*1024,totalJsGzipBytes:12*1024*1024},
  advisoryTarget:{totalJsGzipBytes:2*1024*1024},
  observations:[]};
const forbidden=[
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /GEMINI_API_KEY/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bservice_role\b/,
  /AIza[0-9A-Za-z_-]{35}.*private/i,
];
for(const ent of entries){
 const bytes=readFileSync(join(root,ent.name));
 const gzipBytes=gzipSync(bytes,{level:9}).byteLength;
 const size=statSync(join(root,ent.name)).size;
 const sha256=createHash("sha256").update(bytes).digest("hex").slice(0,16);
 report.assets.push({file:ent.name,sizeBytes:size,gzipBytes,sha256Prefix:sha256});
 if(ent.name.endsWith(".js")){
  report.totalJsGzipBytes+=gzipBytes;
  report.largestJsGzipBytes=Math.max(report.largestJsGzipBytes,gzipBytes);
  const content=bytes.toString("utf8");
  for(const pattern of forbidden)if(pattern.test(content))
    throw new Error("Possible sensitive browser source marker in "+ent.name+" (inspect without leaking bytes)");
 }else report.totalCssGzipBytes+=gzipBytes;
}
report.assets.sort((a,b)=>b.gzipBytes-a.gzipBytes);
if(report.totalJsGzipBytes>report.advisoryTarget.totalJsGzipBytes)
 report.observations.push("Customer bundle above advisory 2 MiB gzip target; profile code-splitting before high-traffic launch.");
if(report.largestJsGzipBytes>report.hardCeilings.largestJsGzipBytes)
 throw new Error("One browser JS chunk exceeds 5 MiB gzip hard gate");
if(report.totalJsGzipBytes>report.hardCeilings.totalJsGzipBytes)
 throw new Error("Browser JS exceeds 12 MiB gzip hard gate");
mkdirSync("artifacts/l4-r0",{recursive:true});
writeFileSync("artifacts/l4-r0/customer-browser-assets.json",JSON.stringify(report,null,2));
console.log("L4_R0_CUSTOMER_ASSETS_PASS totalJsGzipKiB="+Math.ceil(report.totalJsGzipBytes/1024)+
 " maxChunkGzipKiB="+Math.ceil(report.largestJsGzipBytes/1024)+
 " totalCssGzipKiB="+Math.ceil(report.totalCssGzipBytes/1024)+
 " files="+report.assets.length+
 " advisoryExceeded="+(report.observations.length>0));
