"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

import { cn } from "@/lib/utils";

export interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  className?: string;
  decimalPlaces?: number;
}

export default function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? value : 0);
  const rounded = useTransform(motionValue, (latest) =>
    parseFloat(latest.toFixed(decimalPlaces))
  );

  useEffect(() => {
    const animation = animate(motionValue, value, {
      duration: 2,
      delay,
      ease: "easeOut",
    });

    return animation.stop;
  }, [motionValue, value, delay]);

  return (
    <motion.span className={cn("inline-block tabular-nums", className)} ref={ref}>
      {rounded}
    </motion.span>
  );
}