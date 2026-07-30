"use client";

import type { FlatPoi } from "@/lib/data/pois";

export function PoiDetailModal({ poi, onClose }: { poi: FlatPoi; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white"
      >
        {poi.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poi.photoUrl} alt={poi.name} className="h-48 w-full object-cover" />
        )}
        <div className="flex flex-col gap-2 overflow-y-auto p-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: poi.categoryColor }} />
            <span className="text-xs opacity-60">
              {poi.categoryName} · {poi.areaName}
            </span>
          </div>
          <h2 className="text-lg font-bold">{poi.name}</h2>
          {poi.description && <p className="text-sm opacity-80">{poi.description}</p>}
          {poi.address && <p className="text-xs opacity-60">📍 {poi.address}</p>}
          {poi.hours && <p className="text-xs opacity-60">🕐 {poi.hours}</p>}
          {poi.tip && <p className="text-xs opacity-70">💡 {poi.tip}</p>}
          <button onClick={onClose} className="mt-2 self-end text-sm font-semibold underline opacity-70">
            סגירה
          </button>
        </div>
      </div>
    </div>
  );
}
