"use client";

import { useEffect, useRef, useState } from "react";

/** Fades content up into place shortly after it mounts. Uses IntersectionObserver
 * to delay the animation until scrolled near view when possible, but always
 * falls back to visible — content must never get stuck hidden if the
 * observer doesn't fire (e.g. tab already scrolled, automation environments). */
export function ScrollReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setAnimate(true);
      return;
    }

    const fallback = setTimeout(() => setAnimate(true), 800);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          clearTimeout(fallback);
          setAnimate(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );
    observer.observe(el);
    return () => {
      clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className={className} style={animate ? { animation: `reveal-up 0.7s ease-out ${delay}ms both` } : undefined}>
      {children}
    </div>
  );
}
