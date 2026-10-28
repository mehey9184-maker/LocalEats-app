// Requires an explicitly started loopback emulator. Exit status is never swallowed.
const {spawnSync}=require("node:child_process");
const result=spawnSync(process.execPath,["tests/firestore-pickup-rules.cjs",...process.argv.slice(2)],{stdio:"inherit"});
process.exit(result.status===null?1:result.status);
