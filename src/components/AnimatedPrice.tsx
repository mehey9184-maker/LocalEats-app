import React, { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

interface AnimatedPriceProps {
  value: number;
  className?: string;
  prefix?: string;
}

/** Display-only movement: the supplied value is always the authoritative amount. */
export function AnimatedPrice({ value, className = "", prefix = "R " }: AnimatedPriceProps) {
  const reducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(() => reducedMotion ? value : 0);
  const displayedRef = useRef(reducedMotion ? value : 0);

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    if (reducedMotion) {
      displayedRef.current = target;
      setDisplayValue(target);
      return;
    }

    const controls = animate(displayedRef.current, target, {
      duration: 0.82,
      // Fast at first, then an increasingly gentle deceleration to the exact price.
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        displayedRef.current = latest;
        setDisplayValue(latest);
      },
      onComplete: () => {
        displayedRef.current = target;
        setDisplayValue(target);
      },
    });
    return () => controls.stop();
  }, [value, reducedMotion]);

  return (
    <span className={`${className} tabular-nums`} aria-label={`${prefix}${value.toFixed(2)}`} aria-live="off">
      {prefix}{displayValue.toFixed(2)}
    </span>
  );
}
