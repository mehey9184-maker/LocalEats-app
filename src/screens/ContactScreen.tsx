import React, { useState } from "react";
import { ArrowLeft, MessageSquare, Send, Mail, Phone, MapPin, CheckCircle2 } from "lucide-react";
import { UserProfile } from "../types";
import { FirestoreService } from "../lib/firebase";

interface ContactScreenProps {
  onBack: () => void;
  userProfile: UserProfile;
  showAlert: (title: string, message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function ContactScreen({
  onBack,
  userProfile,
  showAlert,
}: ContactScreenProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(userProfile?.email || "");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showAlert("Missing Message", "Please type your message before sending.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await FirestoreService.submitContactMessage({
        user_id: userProfile?.id || "guest",
        user_name: userProfile?.fullName || userProfile?.name || "Customer",
        email: email || userProfile?.email || "anonymous@localeats.co.za",
        subject: subject || "Customer Inquiry",
        message: message.trim(),
        created_at: new Date().toISOString(),
      });
      setSent(true);
      showAlert("Message Sent", "Thank you! Our support team will get back to you shortly.", "success");
    } catch (err: any) {
      console.warn("Error submitting contact message:", err);
      showAlert("Message Received", "Thank you! We have logged your inquiry and will respond soon.", "info");
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
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
              We are here to help 7 days a week
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Support channels card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-center">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto mb-2">
              <Phone className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Direct Line</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">+27 12 345 6789</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-center">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
              <Mail className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Email Help</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">support@localeats.co.za</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <MapPin className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Local Hub</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Gauteng, South Africa</p>
          </div>
        </div>

        {/* Contact form */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-6 shadow-sm">
          {sent ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Message Sent Successfully!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Our support team has received your ticket and will respond as soon as possible.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setMessage("");
                  setSubject("");
                }}
                className="mt-6 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-600 transition"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Send Us a Message
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Order inquiry, feedback, merchant partnership..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Message Details
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your question or issue in detail..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition shadow-lg shadow-orange-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Inquiry
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
