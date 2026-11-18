import { useEffect, useId, useRef } from "react";

type Props = {
  appName: string;
  instructions: string[] | null;
  onClose: () => void;
};

export function InstallAppHelp({ appName, instructions, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog ref={dialogRef} onClose={onClose} aria-labelledby={titleId}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-3xl border p-5 shadow-xl backdrop:bg-black/50 border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
      <h2 id={titleId} className="text-base font-extrabold">Install {appName}</h2>
      {instructions ? (
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-5 text-slate-600 dark:text-slate-300">
          {instructions.map((step) => <li key={step}>{step}</li>)}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">The install prompt is unavailable. Try again in a browser that supports installing web apps.</p>
      )}
      <form method="dialog" className="mt-5 flex justify-end">
        <button type="submit" autoFocus
          className="min-h-11 rounded-xl px-4 text-sm font-bold motion-safe:transition-transform motion-safe:active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 bg-orange-700 text-white focus-visible:outline-orange-600">
          Done
        </button>
      </form>
    </dialog>
  );
}
