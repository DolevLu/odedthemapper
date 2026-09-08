/** Shared line-icon set for the app's own chrome (sidebar, bottom nav,
 * drawer) — a <symbol>/<use> sprite instead of one inline <svg> per icon per
 * usage, since several of these render 2-3 times each (desktop nav + mobile
 * drawer + mobile bottom tab all point at the same destination item).
 * Deliberately not emoji: emoji render inconsistently across platforms/fonts
 * and can't pick up the destination's own color via currentColor the way
 * these stroke icons do. Mount <NavIconSprite/> once per page (anywhere in
 * the tree — <use> resolves by id against the whole document); render icons
 * anywhere after that with <NavIcon name="home" />. */
export function NavIconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <symbol id="nav-i-home" viewBox="0 0 24 24">
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
          <path d="M10 20v-6h4v6" />
        </symbol>
        <symbol id="nav-i-globe" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17" />
          <path d="M12 3.5c2.8 2.3 4.3 5.3 4.3 8.5s-1.5 6.2-4.3 8.5c-2.8-2.3-4.3-5.3-4.3-8.5S9.2 5.8 12 3.5Z" />
        </symbol>
        <symbol id="nav-i-suitcase" viewBox="0 0 24 24">
          <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
          <path d="M9 7.5V5.8a1.3 1.3 0 0 1 1.3-1.3h3.4A1.3 1.3 0 0 1 15 5.8v1.7" />
          <path d="M3.5 13h17" />
        </symbol>
        <symbol id="nav-i-compass" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M14.8 9.2 13 13l-3.8 1.8L11 11Z" />
        </symbol>
        <symbol id="nav-i-map" viewBox="0 0 24 24">
          <path d="M9 4.5 3.8 6.2v13l5.2-1.7 6 1.7 5.2-1.7v-13L14.9 6.2Z" />
          <path d="M9 4.5v13" />
          <path d="M15 6.2v13" />
        </symbol>
        <symbol id="nav-i-calendar" viewBox="0 0 24 24">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M3.5 9.7h17" />
          <path d="M8 3.3v3.4" />
          <path d="M16 3.3v3.4" />
        </symbol>
        <symbol id="nav-i-heart" viewBox="0 0 24 24">
          <path d="M12 19.5s-7-4.2-9-8C1 8 2.3 4.8 5.6 4.3c2-.3 3.6.8 4.4 2.2.8-1.4 2.4-2.5 4.4-2.2C17.7 4.8 19 8 17 11.5c-2 3.8-5 6-5 8Z" />
        </symbol>
        <symbol id="nav-i-ticket" viewBox="0 0 24 24">
          <path d="M3.5 9.3a2 2 0 0 0 0 5.4v2H20.5v-2a2 2 0 0 1 0-5.4v-2H3.5Z" />
          <path d="M9.5 7.3v9.4" />
        </symbol>
        <symbol id="nav-i-plane" viewBox="0 0 24 24">
          <path d="M11 20.5 12 15l-8-.9 1.4-2 8 1 3.8-7.3 2 .7-2.3 7.9L20.5 18l-2 1.3-4-5.3L11 20.5Z" />
        </symbol>
        <symbol id="nav-i-wallet" viewBox="0 0 24 24">
          <rect x="3.5" y="6.3" width="17" height="12.4" rx="2" />
          <path d="M3.5 10.3h17" />
          <circle cx="16.7" cy="14.3" r="1.1" />
        </symbol>
        <symbol id="nav-i-briefcase" viewBox="0 0 24 24">
          <rect x="3.5" y="8" width="17" height="11" rx="2" />
          <path d="M8.5 8V6.3A1.3 1.3 0 0 1 9.8 5h4.4a1.3 1.3 0 0 1 1.3 1.3V8" />
          <path d="M3.5 13.2h17" />
        </symbol>
        <symbol id="nav-i-file" viewBox="0 0 24 24">
          <path d="M7 3.5h6.5L18 8v12.5H7Z" />
          <path d="M13.5 3.5V8H18" />
          <path d="M9.5 13h5" />
          <path d="M9.5 16.3h5" />
        </symbol>
        <symbol id="nav-i-weather" viewBox="0 0 24 24">
          <circle cx="7.5" cy="8" r="2.6" />
          <path d="M7.5 3.8v1.3M4.3 5.8l.9.9M10.7 5.8l-.9.9" />
          <path d="M14 17H7.3a3.3 3.3 0 0 1-.5-6.6" />
          <path d="M14 17a3.6 3.6 0 0 0 0-7.2c-.3 0-.6 0-.9.1" />
        </symbol>
        <symbol id="nav-i-quiz" viewBox="0 0 24 24">
          <path d="M12 3.3a5.2 5.2 0 0 0-3.3 9.2c.6.5 1 1.2 1 2v.8h4.6v-.8c0-.8.4-1.5 1-2A5.2 5.2 0 0 0 12 3.3Z" />
          <path d="M10 18.6h4" />
          <path d="M10.7 21h2.6" />
        </symbol>
        <symbol id="nav-i-chat" viewBox="0 0 24 24">
          <path d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v6.4a2.8 2.8 0 0 1-2.8 2.8H9.5L5 19.5v-3.8A2.8 2.8 0 0 1 4 13.6Z" />
        </symbol>
        <symbol id="nav-i-checklist" viewBox="0 0 24 24">
          <rect x="5" y="3.5" width="14" height="17" rx="2" />
          <path d="M9 3.5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.5" />
          <path d="M8.3 11.3l1.3 1.3 2.3-2.6" />
          <path d="M8.3 16.3l1.3 1.3 2.3-2.6" />
        </symbol>
        <symbol id="nav-i-camera" viewBox="0 0 24 24">
          <rect x="3.3" y="7" width="17.4" height="12.7" rx="2" />
          <path d="M8 7l1.3-2.3h5.4L16 7" />
          <circle cx="12" cy="13.3" r="3.3" />
        </symbol>
        <symbol id="nav-i-menu" viewBox="0 0 24 24">
          <path d="M4.5 7.5h15" />
          <path d="M4.5 12h15" />
          <path d="M4.5 16.5h15" />
        </symbol>
        <symbol id="nav-i-sparkle" viewBox="0 0 24 24">
          <path d="M12 3.3 13.9 9l5.8 1.9-5.8 1.9L12 18.7l-1.9-5.9L4.3 10.9l5.8-1.9Z" />
        </symbol>
        <symbol id="nav-i-download" viewBox="0 0 24 24">
          <path d="M12 3.3v11.4" />
          <path d="M7.5 11l4.5 4.5L16.5 11" />
          <path d="M5 20h14" />
        </symbol>
        <symbol id="nav-i-tool" viewBox="0 0 24 24">
          <path d="M14.7 6.3a3.6 3.6 0 0 1-4.6 4.9L4.7 16.6a1.7 1.7 0 0 0 2.4 2.4l5.4-5.4a3.6 3.6 0 0 1 4.9-4.6L15 11.4l-1.4-1.4Z" />
        </symbol>
      </defs>
    </svg>
  );
}

export type NavIconName =
  | "home"
  | "globe"
  | "suitcase"
  | "compass"
  | "map"
  | "calendar"
  | "heart"
  | "ticket"
  | "plane"
  | "wallet"
  | "briefcase"
  | "file"
  | "weather"
  | "quiz"
  | "chat"
  | "checklist"
  | "camera"
  | "menu"
  | "sparkle"
  | "download"
  | "tool";

export function NavIcon({ name, size = 18, className }: { name: NavIconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={{ stroke: "currentColor", strokeWidth: 1.8, fill: "none", strokeLinecap: "round", strokeLinejoin: "round", display: "block" }}
      aria-hidden="true"
    >
      <use href={`#nav-i-${name}`} />
    </svg>
  );
}
