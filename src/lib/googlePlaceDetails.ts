/** Everything worth keeping from a Google place card - the shape shared by the
 * map's save-pin form and the bulk import/AI flows. */
export type GoogleDetails = {
  address: string | null;
  phone: string | null;
  website: string | null;
  url: string | null;
  photoUrl: string | null;
  rating: number | null;
  ratingCount: number | null;
  hours: string[] | null;
  suggestedCategory: string | null;
};

/** Maps Google's place "types" onto the app's fixed pin categories so a saved
 * place starts out in a sensible category instead of the generic "אחר". */
export function suggestedCategoryFromTypes(types: string[] | undefined): string | null {
  if (!types) return null;
  const has = (...names: string[]) => names.some((n) => types.includes(n));
  if (has("cafe", "bakery")) return "בתי קפה";
  if (has("bar", "night_club")) return "ברים";
  if (has("restaurant", "meal_takeaway", "meal_delivery", "food")) return "מסעדות";
  if (has("park", "campground", "natural_feature")) return "פארקים";
  if (has("subway_station", "train_station", "transit_station", "light_rail_station")) return "תחנות מטרו ורכבת";
  if (has("locality", "sublocality", "administrative_area_level_1", "administrative_area_level_2")) return "ערים ועיירות";
  if (has("tourist_attraction", "museum", "art_gallery", "church", "place_of_worship", "amusement_park", "zoo", "aquarium")) return "אטרקציות";
  return null;
}

/** The place fields a details request must ask for to fill GoogleDetails. */
export const GOOGLE_DETAIL_FIELDS = [
  "name",
  "geometry",
  "rating",
  "user_ratings_total",
  "formatted_address",
  "formatted_phone_number",
  "opening_hours",
  "website",
  "photos",
  "url",
  "types",
  "place_id",
];

export function googleDetailsFromPlace(place: google.maps.places.PlaceResult): GoogleDetails {
  return {
    address: place.formatted_address ?? null,
    phone: place.formatted_phone_number ?? null,
    website: place.website ?? null,
    url: place.url ?? null,
    photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 800 }) ?? null,
    rating: place.rating ?? null,
    ratingCount: place.user_ratings_total ?? null,
    hours: place.opening_hours?.weekday_text ?? null,
    suggestedCategory: suggestedCategoryFromTypes(place.types),
  };
}

export type ResolvedPin = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  categoryName: string | null;
  note: string | null;
  details: GoogleDetails | null;
};

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

/** Finds one real place on Google by name (biased toward `near`) and returns
 * its full details, or null when Google can't find it. The Places library
 * must already be loaded. */
export async function resolvePlaceByQuery(
  service: google.maps.places.PlacesService,
  query: string,
  near: { lat: number; lng: number } | null
): Promise<ResolvedPin | null> {
  const found = await withTimeout(
    new Promise<google.maps.places.PlaceResult | null>((resolve) => {
      service.findPlaceFromQuery(
        {
          query,
          fields: ["place_id"],
          ...(near ? { locationBias: { center: near, radius: 50000 } } : {}),
        },
        (results, status) => resolve(status === google.maps.places.PlacesServiceStatus.OK && results?.[0] ? results[0] : null)
      );
    }),
    8000,
    null
  );
  if (!found?.place_id) return null;
  const place = await withTimeout(
    new Promise<google.maps.places.PlaceResult | null>((resolve) => {
      service.getDetails({ placeId: found.place_id!, fields: GOOGLE_DETAIL_FIELDS }, (p, status) =>
        resolve(status === google.maps.places.PlacesServiceStatus.OK ? p : null)
      );
    }),
    8000,
    null
  );
  if (!place?.geometry?.location) return null;
  const details = googleDetailsFromPlace(place);
  return {
    placeId: found.place_id,
    name: place.name ?? query,
    lat: place.geometry.location.lat(),
    lng: place.geometry.location.lng(),
    categoryName: details.suggestedCategory,
    note: null,
    details,
  };
}

/** Runs `worker` over `items` with at most `concurrency` in flight (Places
 * rate-limits bursts), reporting progress after each one finishes. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let done = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
      onProgress?.(++done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

/** Full details for a known Google place id (e.g. a search suggestion the
 * user picked). */
export async function resolvePlaceById(service: google.maps.places.PlacesService, placeId: string): Promise<ResolvedPin | null> {
  const place = await withTimeout(
    new Promise<google.maps.places.PlaceResult | null>((resolve) => {
      service.getDetails({ placeId, fields: GOOGLE_DETAIL_FIELDS }, (p, status) =>
        resolve(status === google.maps.places.PlacesServiceStatus.OK ? p : null)
      );
    }),
    8000,
    null
  );
  if (!place?.geometry?.location) return null;
  const details = googleDetailsFromPlace(place);
  return {
    placeId,
    name: place.name ?? '',
    lat: place.geometry.location.lat(),
    lng: place.geometry.location.lng(),
    categoryName: details.suggestedCategory,
    note: null,
    details,
  };
}
