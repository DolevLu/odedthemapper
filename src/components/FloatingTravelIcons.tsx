const ICONS: { icon: string; top: string; left: string; size: string; duration: string; rot: string; delay: string }[] = [
  { icon: "✈️", top: "8%", left: "8%", size: "2.5rem", duration: "7s", rot: "-12deg", delay: "0s" },
  { icon: "🗺️", top: "18%", left: "88%", size: "2.2rem", duration: "8s", rot: "10deg", delay: "0.5s" },
  { icon: "🧳", top: "70%", left: "5%", size: "2.2rem", duration: "6.5s", rot: "-6deg", delay: "1s" },
  { icon: "📍", top: "12%", left: "48%", size: "1.8rem", duration: "5.5s", rot: "0deg", delay: "0.3s" },
  { icon: "🏖️", top: "75%", left: "90%", size: "2.4rem", duration: "7.5s", rot: "8deg", delay: "0.8s" },
  { icon: "🗼", top: "55%", left: "94%", size: "1.9rem", duration: "6s", rot: "-4deg", delay: "1.4s" },
  { icon: "🎒", top: "60%", left: "15%", size: "1.8rem", duration: "6.8s", rot: "6deg", delay: "1.8s" },
  { icon: "🧭", top: "30%", left: "3%", size: "1.7rem", duration: "5.8s", rot: "-8deg", delay: "0.2s" },
];

export function FloatingTravelIcons() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {ICONS.map((it, i) => {
        const style = {
          top: it.top,
          left: it.left,
          fontSize: it.size,
          animationDelay: it.delay,
          "--float-duration": it.duration,
          "--float-rot": it.rot,
        } as React.CSSProperties;
        return (
          <span key={i} className="absolute animate-float-drift select-none opacity-[0.16]" style={style}>
            {it.icon}
          </span>
        );
      })}
    </div>
  );
}
