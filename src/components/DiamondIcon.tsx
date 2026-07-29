export function DiamondIcon({ variant, size = 14 }: { variant: "gold" | "blue"; size?: number }) {
  const color = variant === "gold" ? "#D4AF37" : "#2563EB";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 9L9 3H15L20 9L12 21L4 9Z"
        fill={color}
        stroke={variant === "gold" ? "#8A6D1E" : "#1E40AF"}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M4 9H20L12 21L4 9Z" fill="white" fillOpacity="0.15" />
      <path d="M9 3L7 9L12 21L9 3Z" fill="white" fillOpacity="0.2" />
      <path d="M15 3L17 9L12 21L15 3Z" fill="black" fillOpacity="0.08" />
    </svg>
  );
}
