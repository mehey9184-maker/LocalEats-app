import React from "react";
import { motion, useReducedMotion } from "motion/react";

/** Animate cart estimates, not payment confirmation or server-side price authority. */
export function CustomerRollingAmount({ value, prefix = "R " }: { value: number; prefix?: string }) {
  const reduced = useReducedMotion();
  const safe = Number.isFinite(value) && value >= 0 ? value : null;
  if (safe === null) return <span>Amount unavailable</span>;
  const printed = safe.toFixed(2);
  if (reduced) return <span className="tabular-nums">{prefix}{printed}</span>;
  return (
    <span aria-label={prefix + printed} className="inline-flex tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
      <span aria-hidden="true">{prefix}</span>
      {Array.from(printed).map((digit, index) =>
        digit === "." ? <span key={index} aria-hidden="true">.</span> :
        <span key={index} aria-hidden="true" className="relative inline-block h-[1em] w-[0.61em] overflow-hidden leading-none">
          <motion.span initial={false}
            animate={{ y: `-${Number(digit)}em` }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1], delay: Math.min(index * 0.045, 0.24) }}
            className="absolute left-0 top-0 w-full flex flex-col items-center">
            {"0123456789".split("").map(num => <span key={num} className="block h-[1em] leading-none">{num}</span>)}
          </motion.span>
        </span>
      )}
    </span>
  );
}
