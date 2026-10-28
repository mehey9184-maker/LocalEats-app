export function rejectLegacyOrderWrite():never {
 const error=Object.assign(new Error("Update required. Use the pickup ordering app."),
  {code:"PICKUP_CONTRACT_REQUIRED",status:426});
 throw error;
}
