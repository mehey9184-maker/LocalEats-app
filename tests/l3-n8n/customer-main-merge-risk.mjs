/**
 * L3-N8N — Customer main↔staging draft reconciliation release gate.
 * Source-reconciliation metadata only; neither GitHub nor Firebase is called.
 */
export const verifiedMain="d5680332d391d9aa497d10ff047c839242b2d62f";
export const isolatedCustomerN8M="ad4f523dd6ea3251cbe154864050255f4be48616";
export const formerlyDeployedCustomerStage="c77736e7b4878965baa31ec2ada8138f554d6a7f";

export function assessCustomerMainReconciliation(evidence={}){
 const blockers=[];
 if(evidence.mainSha!==verifiedMain)
   blockers.push("The latest Customer main SHA must be re-audited before any staging reconciliation.");
 if(evidence.sourceDraftSha!==isolatedCustomerN8M)
   blockers.push("The N8M base SHA for the staged security changes does not match its reviewed branch.");
 if(evidence.replayedLatestReceiptAndHistory!==true)
   blockers.push("The merged main receipt/history/paginated orders work is not reviewed on the staged branch.");
 if(evidence.originalShopCardVerified!==true||evidence.originalCheckoutQuoteVerified!==true)
   blockers.push("Original Customer ShopCard, checkout quote panel and disabled ordering have not been regression-accepted.");
 if(evidence.stagingFirebaseNoWriteGuardsPreserved!==true ||
    evidence.communityReadContractDormant!==true)
   blockers.push("The N8L/N8M staged no-write and dormant community access protections must survive reconciliation.");
 if(evidence.reviewedNoLegacyOrderFallbackActivation!==true)
   blockers.push("Legacy Firebase callable/Express client-price or in-memory order fallback reachability is unresolved.");
 if(evidence.currentMainReceiptTestsPassed!==true ||
    evidence.stagedPrivacyAndPickupTestsPassed!==true)
   blockers.push("Both the latest main receipt/history tests and staged pickup/privacy tests must pass on one commit.");
 if(evidence.ownerApprovedPreviewOnlyReconciliation!==true)
   blockers.push("Owner approval for the exact reconciled Customer Preview release is not recorded.");
 return Object.freeze({
  eligibleForPairedStagingRelease:blockers.length===0,
  blockers:Object.freeze(blockers),
  realHostedPreviewAccepted:false,
  productionMergeAuthorized:false,
  pickupOrderWritesAuthorized:false,
 });
}
