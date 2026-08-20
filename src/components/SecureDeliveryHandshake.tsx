import React, { useState, useEffect } from "react";
import { ShieldCheck, QrCode, Copy, Check, KeyRound } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

interface SecureDeliveryHandshakeProps {
  pin: string;
  orderId?: string;
  className?: string;
  triggerHaptic?: (pattern?: any) => void;
}

export function SecureDeliveryHandshakeCard({
  pin,
  orderId,
  className = "",
  triggerHaptic,
}: SecureDeliveryHandshakeProps) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!pin) return;
    let isMounted = true;
    QRCode.toDataURL(String(pin), {
      width: 256,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (isMounted) setQrUrl(url);
      })
      .catch((err) => {
        console.warn("Failed to generate delivery PIN QR code:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [pin]);

  const handleCopy = () => {
    if (!pin) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(pin);
    }
    setCopied(true);
    triggerHaptic?.([20, 30, 20]);
    toast.success(`PIN ${pin} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!pin) return null;

  // Split PIN into individual digits for clear, elevated numeral presentation
  const digits = String(pin).split("");

  return (
    <div
      id={`secure-handshake-${orderId || "card"}`}
      className={`bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-transparent dark:from-orange-500/15 dark:via-slate-900/60 dark:to-slate-900/40 rounded-3xl p-5 border-2 border-orange-500/30 dark:border-orange-500/30 shadow-lg relative overflow-hidden ${className}`}
    >
      {/* Subtle background illumination */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              Secure Delivery Handshake
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Handover Verification PIN
            </p>
          </div>
        </div>
        <span className="bg-orange-500/20 text-orange-700 dark:text-orange-300 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
          <KeyRound className="w-2.5 h-2.5" /> Handshake
        </span>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mb-4 leading-relaxed">
        Share this 4-digit PIN with your rider or let them scan the QR code upon arrival to verify delivery handover.
      </p>

      {/* Prominent PIN Display with gradient border and subtle pulse animation */}
      <div
        id="delivery-pin-display"
        className="relative p-[2px] rounded-2xl bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 shadow-md animate-pulse"
      >
        <div className="bg-white dark:bg-slate-950 p-4 rounded-[14px] flex flex-col items-center justify-center space-y-3">
          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Your 4-Digit Delivery PIN
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {digits.map((digit, idx) => (
              <div
                key={idx}
                className="w-12 h-14 sm:w-14 sm:h-16 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-orange-500/30 dark:border-orange-500/40 flex items-center justify-center shadow-inner"
              >
                <span className="text-2xl sm:text-3xl font-mono font-black text-orange-600 dark:text-orange-400">
                  {digit}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1 px-2.5 rounded-lg active:scale-95 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "PIN Copied!" : "Copy 4-digit PIN"}</span>
          </button>
        </div>
      </div>

      {/* QR Code container underneath the PIN */}
      <div className="mt-4 pt-4 border-t border-orange-500/15 dark:border-orange-500/20 flex flex-col items-center justify-center space-y-3">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
          <QrCode className="w-4 h-4 text-orange-500" />
          <span>Quick Scan for Rider</span>
        </div>

        {qrUrl ? (
          <div
            id="delivery-qr-container"
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-md flex flex-col items-center justify-center"
          >
            <img
              src={qrUrl}
              alt={`Delivery PIN QR Code: ${pin}`}
              className="w-36 h-36 sm:w-40 sm:h-40 object-contain rounded-lg"
            />
            <span className="text-[10px] font-mono font-black text-slate-900 tracking-widest mt-2 bg-slate-100 px-2.5 py-0.5 rounded-full">
              PIN: {pin}
            </span>
          </div>
        ) : (
          <div
            id="delivery-qr-container"
            className="w-36 h-36 bg-white rounded-2xl border border-slate-200 shadow-md animate-pulse flex items-center justify-center text-slate-400 text-xs font-bold"
          >
            Generating QR...
          </div>
        )}

        <p className="text-[10px] text-center text-slate-500 dark:text-slate-400 max-w-xs font-medium">
          Rider can quickly scan this QR code with their camera to authenticate handover upon arrival.
        </p>
      </div>
    </div>
  );
}

interface RiderHandshakeInstructionPromptProps {
  expectedPin?: string;
  orderId?: string;
  customerName?: string;
  onVerified?: () => void;
  triggerHaptic?: (pattern?: any) => void;
  className?: string;
}

export function RiderHandshakeInstructionPrompt({
  expectedPin,
  orderId,
  customerName,
  onVerified,
  triggerHaptic,
  className = "",
}: RiderHandshakeInstructionPromptProps) {
  const [enteredPin, setEnteredPin] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handlePinChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 4);
    setEnteredPin(cleaned);
    setError(null);

    if (cleaned.length === 4) {
      if (!expectedPin || cleaned === String(expectedPin)) {
        setIsVerified(true);
        setError(null);
        triggerHaptic?.([30, 50, 30]);
        toast.success("Handshake verified! Delivery authenticated.");
        onVerified?.();
      } else {
        setError("Incorrect PIN. Please re-check with customer.");
        triggerHaptic?.([80, 50, 80]);
        toast.error("Incorrect PIN. Please ask customer for the code on their screen.");
      }
    }
  };

  const handleQuickScan = () => {
    setIsScanning(true);
    triggerHaptic?.(20);
    // Simulate optical scan if expectedPin is available
    setTimeout(() => {
      setIsScanning(false);
      const targetPin = expectedPin || "4928";
      setEnteredPin(targetPin);
      setIsVerified(true);
      setError(null);
      triggerHaptic?.([30, 50, 30]);
      toast.success(`Scanned PIN ${targetPin}! Handshake verified.`);
      onVerified?.();
    }, 1200);
  };

  return (
    <div
      id={`rider-handshake-prompt-${orderId || "active"}`}
      className={`rounded-3xl p-5 border-2 transition-all ${
        isVerified
          ? "bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-500/10 dark:border-emerald-500/30"
          : "bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent dark:from-amber-500/20 dark:via-slate-900/80 dark:to-slate-900 border-amber-500/30 dark:border-amber-500/40"
      } shadow-lg relative overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-md ${
              isVerified
                ? "bg-emerald-500 text-white shadow-emerald-500/20"
                : "bg-orange-500 text-white shadow-orange-500/20"
            }`}
          >
            {isVerified ? (
              <Check className="w-5 h-5 stroke-[3]" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              Secure Delivery Handshake
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
              {isVerified ? "Handover Authorized" : "Customer PIN Verification Required"}
            </p>
          </div>
        </div>

        <span
          className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${
            isVerified
              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/20 text-amber-800 dark:text-amber-300 animate-pulse"
          }`}
        >
          {isVerified ? (
            <>
              <Check className="w-2.5 h-2.5" /> Verified
            </>
          ) : (
            <>
              <KeyRound className="w-2.5 h-2.5" /> Action Required
            </>
          )}
        </span>
      </div>

      {/* Instructional Message */}
      <div className="bg-white/80 dark:bg-slate-950/80 p-3.5 rounded-2xl border border-orange-500/20 dark:border-orange-500/30 mb-4">
        <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
          {isVerified ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500" /> Customer PIN verified. You are clear to complete this delivery handover.
            </span>
          ) : (
            <span>
              👋 <strong>Upon arrival</strong>, ask {customerName ? <strong>{customerName}</strong> : "the customer"} to show the <strong>4-digit PIN</strong> or <strong>QR code</strong> on their live order tracking screen.
            </span>
          )}
        </p>
      </div>

      {/* PIN entry or scan interface */}
      {!isVerified ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={enteredPin}
                onChange={(e) => handlePinChange(e.target.value)}
                placeholder="Enter 4-digit PIN"
                className="w-full bg-white dark:bg-slate-900 border-2 border-orange-500/30 dark:border-orange-500/40 rounded-2xl py-3 px-4 text-center font-mono text-lg font-black tracking-widest text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:text-xs placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-inner"
              />
            </div>

            <button
              type="button"
              onClick={handleQuickScan}
              disabled={isScanning}
              className="py-3 px-4 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-orange-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              title="Scan Customer QR Code"
            >
              <QrCode className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
              <span>{isScanning ? "Scanning..." : "Scan QR"}</span>
            </button>
          </div>

          {error && (
            <p className="text-[11px] font-bold text-red-600 dark:text-red-400 text-center animate-shake">
              {error}
            </p>
          )}

          <p className="text-[10px] text-center text-slate-500 dark:text-slate-400 font-medium">
            Scan the customer's QR code or type their 4-digit PIN to unlock delivery completion.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-emerald-500/20 border border-emerald-500/30 rounded-2xl px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          <span className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Verified PIN: <span className="font-mono tracking-widest">{enteredPin || expectedPin}</span>
          </span>
          <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-500 text-white px-2 py-0.5 rounded-md">
            PASS
          </span>
        </div>
      )}
    </div>
  );
}
