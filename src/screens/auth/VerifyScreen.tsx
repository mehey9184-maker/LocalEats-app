import React, { useState, useEffect } from "react";
import { ArrowLeft, Delete } from "lucide-react";

export interface VerifyScreenProps {
  phone: string;
  onNext: () => void;
  onBack: () => void;
}

export function VerifyScreen({ phone, onNext, onBack }: VerifyScreenProps) {
  const [timer, setTimer] = useState(30);
  const [code, setCode] = useState(["", "", "", ""]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleResend = () => {
    if (timer === 0) {
      setTimer(30);
      // Logic to resend code
    }
  };

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`verify-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="font-sans bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        <header className="flex items-center p-4">
          <button
            onClick={onBack}
            className="size-10 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </header>
        <main className="flex-1 px-6 pt-4 pb-12 flex flex-col">
          <div className="mb-10">
            <h1 className="text-3xl font-bold mb-3">Verification Code</h1>
            <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
              Please enter the 4-digit code sent to{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                +27 {phone || "82 123 4567"}
              </span>
            </p>
          </div>
          <div className="flex justify-between gap-4 mb-8">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`verify-input-${index}`}
                className="w-16 h-16 text-center text-2xl font-bold bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-primary focus:ring-0 transition-colors"
                maxLength={1}
                type="text"
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                autoFocus={index === 0}
              />
            ))}
          </div>
          <div className="text-center mb-10">
            <p className="text-slate-500 text-sm">Didn't receive the code?</p>
            <button
              onClick={handleResend}
              disabled={timer > 0}
              className={`font-semibold text-sm mt-1 cursor-pointer ${
                timer > 0 ? "text-slate-400" : "text-primary hover:underline"
              }`}
            >
              Resend Code{" "}
              {timer > 0 ? `(00:${timer.toString().padStart(2, "0")})` : ""}
            </button>
          </div>
          <button
            onClick={onNext}
            disabled={code.some((d) => !d)}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all mb-12 cursor-pointer"
          >
            Verify & Continue
          </button>
          <div className="mt-auto grid grid-cols-3 gap-2 max-w-sm mx-auto w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => {
                  const emptyIndex = code.findIndex((d) => !d);
                  if (emptyIndex !== -1)
                    handleInputChange(emptyIndex, num.toString());
                }}
                className="h-14 flex items-center justify-center text-2xl font-semibold rounded-lg hover:bg-primary/10 cursor-pointer"
              >
                {num}
              </button>
            ))}
            <div className="h-14"></div>
            <button
              onClick={() => {
                const emptyIndex = code.findIndex((d) => !d);
                if (emptyIndex !== -1) handleInputChange(emptyIndex, "0");
              }}
              className="h-14 flex items-center justify-center text-2xl font-semibold rounded-lg hover:bg-primary/10 cursor-pointer"
            >
              0
            </button>
            <button
              onClick={() => {
                const lastFilledIndex = [...code].reverse().findIndex((d) => d);
                if (lastFilledIndex !== -1) {
                  const index = 3 - lastFilledIndex;
                  handleInputChange(index, "");
                }
              }}
              className="h-14 flex items-center justify-center rounded-lg hover:bg-primary/10 cursor-pointer"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>
        </main>
        <div className="flex items-center justify-center pb-4">
          <div className="w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
