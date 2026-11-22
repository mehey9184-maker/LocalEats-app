// Navigation intent is not authentication and never creates an account/order.
export function qrShopId(search: string): string | null {
  const values = new URLSearchParams(search).getAll('shopId');
  const id = values[0];
  return values.length === 1 && id && id.trim() && id.length <= 200 &&
    !/[\u0000-\u001f\u007f]/.test(id) ? id : null;
}

export function withoutShopLink(path: string): string {
  const url = new URL(path, 'https://local.invalid');
  url.searchParams.delete('shopId');
  return url.pathname + url.search + url.hash;
}

export function checkoutNavigationStack(stack: string[]): string[] {
  const authentication = new Set(['splash', 'login', 'login-success', 'signup', 'verify',
    'setup-pin', 'setup-password', 'success', 'complete-profile', 'checkout']);
  const browsing = stack.filter(screen => !authentication.has(screen));
  if (browsing[0] !== 'home') browsing.unshift('home');
  return [...browsing, 'checkout'];
}

export function completedSignInScreen(current: string, destination: 'checkout' | null): string {
  // LoginScreen has a success animation delay. Its callback may arrive after
  // the session listener resumed checkout or the customer already went Back.
  return current === 'login' ? destination || 'login-success' : current;
}

type Identity = { uid: string; isAnonymous: boolean } | null;
export function signedInCustomer(user: Identity, sessionId?: string): boolean {
  return !!user && user.isAnonymous === false && !!sessionId && user.uid === sessionId;
}

export function createCheckoutReturn() {
  let pending = false;
  return {
    request: () => { pending = true; },
    destination: (): 'checkout' | null => pending ? 'checkout' : null,
    resolve: (user: Identity, sessionId?: string): 'checkout' | null =>
      pending && signedInCustomer(user, sessionId) ? 'checkout' : null,
    complete: () => { pending = false; },
  };
}
