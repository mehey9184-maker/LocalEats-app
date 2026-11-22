# Customer QR guest browsing and installation

Owner approved the previously discussed menu-first flow: QR opens the original shop menu without creating an account; authenticated ordering remains required. Keep cart/options through sign-in. Preserve real-location and 4 km checks, closed-shop behavior, server pricing and all write flags. No notification permission request accompanies browsing or installing.

Approach: reuse PR #125 public approved-shop browsing (ac1f993) as an explicit unmerged dependency. Reuse only existing installation helpers from feature/customer-app-install, not its whole app or icon changes. Do not merge either candidate into Production in this task. Automatic account creation and timed full-screen install popups were rejected in the discussion.

QR URLs retain the selected shop through refresh and sign-in; ordinary navigation away clears only shopId. Guest labels are truthful. Checkout sign-in returns to the retained cart/checkout using existing Firebase screens. Install uses the browser's own prompt only after a click, with platform help otherwise. A small menu install action is available manually. An inline invitation appears after two distinct menu item selections, then sleeps seven days after dismissal; no timer interrupts the menu. Standalone display/iOS standalone/appinstalled suppress invitations and help. Where installation cannot be detected, do not claim certainty.

No new provider, subscription, schema, auth policy or app dependency. Verify mocked/offline behavior, TypeScript/build and original interface; real GPS/install-camera checks remain device acceptance, never fabricated.
