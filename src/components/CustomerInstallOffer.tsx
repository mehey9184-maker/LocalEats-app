import { Download } from 'lucide-react';
import { useAppInstallation } from '../hooks/useAppInstallation';
import { InstallAppHelp } from './InstallAppHelp';

export function CustomerInstallOffer({showInvite = false, onDismiss = () => {}}: {
  showInvite?: boolean; onDismiss?: () => void;
}) {
  const app = useAppInstallation();
  if (!app.available) return null;
  const install = async () => {
    const outcome = await app.install();
    // A prompt choice isn't proof of installation; only suppress the invitation.
    if (outcome === 'dismissed' || outcome === 'accepted') onDismiss();
  };
  return <section aria-label="Install LocalEats" className={showInvite
    ? 'rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30'
    : 'flex justify-end'}>
    {showInvite && <><h3 className="font-bold text-slate-900 dark:text-white">Keep your favourites one tap away</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Add LocalEats to your home screen. You can keep browsing here, too.</p></>}
    <div className={'flex flex-wrap items-center gap-2' + (showInvite ? ' mt-3' : '')}>
      <button type="button" onClick={() => { void install(); }} disabled={app.busy}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-orange-700 hover:bg-orange-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-50 dark:text-orange-300 dark:hover:bg-orange-950">
        <Download size={16} aria-hidden="true"/>{app.busy ? 'Opening install…' : 'Install LocalEats'}
      </button>
      {showInvite && <button type="button" onClick={onDismiss} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-slate-300">Not now</button>}
    </div>
    {app.showHelp && <InstallAppHelp appName="LocalEats" instructions={app.instructions} onClose={app.closeHelp}/>}
  </section>;
}
