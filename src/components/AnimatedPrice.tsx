import React, { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";

interface AnimatedPriceProps {
  value: number;
  className?: string;
  prefix?: string;
}

export function AnimatedPrice({ value, className = "", prefix = "R " }: AnimatedPriceProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const from = prevValueRef.current;
    const to = value;
    prevValueRef.current = value;

    const controls = animate(from, to, {
      duration: 0.45,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(latest);
      }
    });

    return () => controls.stop();
  }, [value]);

  return <span className={className}>{prefix}{displayValue.toFixed(2)}</span>;
}
