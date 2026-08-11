// Pure CSS — only becomes visible via the .portrait-only-gate media query in
// globals.css (small screen + landscape). No JS needed since orientation
// changes are already a CSS-observable event.
export function PortraitOnlyGate() {
  return (
    <div className="portrait-only-gate">
      <span style={{ fontSize: "2.5rem" }}>📱</span>
      <p style={{ fontWeight: 700 }}>האפליקציה מיועדת לשימוש במצב אנכי</p>
      <p style={{ opacity: 0.7, fontSize: "0.875rem" }}>סובבו את המכשיר בחזרה כדי להמשיך</p>
    </div>
  );
}
