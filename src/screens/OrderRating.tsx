import React, { useState } from "react";
import { Star, Clock, X, ThumbsUp, MessageSquare, Send, Sparkles } from "lucide-react";

interface OrderRatingProps {
  pendingReview: {
    orderId: string | number;
    shopId: string | number;
    shopName?: string;
    itemsSummary?: string;
    riderName?: string;
    snoozeCount?: number;
  };
  onSnooze: () => void;
  onSubmit: (
    shopRating: number,
    shopComment: string,
    riderRating: number,
    riderComment: string
  ) => Promise<void>;
  onDismiss?: () => void;
}

export function OrderRating({
  pendingReview,
  onSnooze,
  onSubmit,
  onDismiss,
}: OrderRatingProps) {
  const [shopRating, setShopRating] = useState<number>(5);
  const [shopComment, setShopComment] = useState<string>("");
  const [riderRating, setRiderRating] = useState<number>(5);
  const [riderComment, setRiderComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(shopRating, shopComment, riderRating, riderComment);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close / Dismiss */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            How was your meal?
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {pendingReview.shopName
              ? `Review your order from ${pendingReview.shopName}`
              : "Help local legendary spots keep top quality"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shop Rating */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Food & Store Rating
            </label>
            <div className="flex items-center justify-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setShopRating(star)}
                  className="p-1 text-slate-300 dark:text-slate-600 hover:text-amber-400 transition"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= shopRating
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300 dark:text-slate-600"
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Delicious flavor, hot food, great portions..."
                value={shopComment}
                onChange={(e) => setShopComment(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Rider Rating */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Courier Delivery Rating {pendingReview.riderName ? `(${pendingReview.riderName})` : ""}
            </label>
            <div className="flex items-center justify-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRiderRating(star)}
                  className="p-1 text-slate-300 dark:text-slate-600 hover:text-amber-400 transition"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= riderRating
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300 dark:text-slate-600"
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Fast delivery, friendly service..."
                value={riderComment}
                onChange={(e) => setRiderComment(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onSnooze}
              disabled={submitting}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Clock className="w-4 h-4" />
              Remind Later
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition shadow-lg shadow-orange-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Review
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
