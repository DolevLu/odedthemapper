"use client";

import { useState, useTransition } from "react";
import { toggleFavorite } from "@/lib/actions/trip";

export function FavoriteButton({
  poiId,
  slug,
  initialFavorited = false,
}: {
  poiId: string;
  slug: string;
  initialFavorited?: boolean;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        setFavorited((f) => !f);
        startTransition(() => {
          toggleFavorite(poiId, slug);
        });
      }}
      disabled={pending}
      className="text-lg leading-none"
      aria-label="הוספה למועדפים"
      title="הוספה למועדפים"
    >
      {favorited ? "❤️" : "🤍"}
    </button>
  );
}
