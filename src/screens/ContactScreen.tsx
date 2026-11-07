import { ArrowLeft, Mail, MessageSquare } from "lucide-react";

export function ContactScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={onBack}
            className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-500" />
              Contact & Support
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Help with LocalEats and pickup orders
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <section className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Email LocalEats</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Open an email draft to describe your issue. If it concerns a pickup, include the order number.
          </p>
          <a
            href="mailto:support@localeats.co.za"
            className="mt-4 inline-flex min-h-11 max-w-full items-center gap-2 break-all rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700"
          >
            <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-orange-600" />
            support@localeats.co.za
          </a>
        </section>
      </div>
    </div>
  );
}
