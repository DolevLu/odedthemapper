export type BookingRecommendation = { title: string; note: string };

/** Curated "worth pre-booking" tips — general international travel norms plus
 * destination-specific highlights where we have them. */
export const GENERAL_BOOKING_TIPS: BookingRecommendation[] = [
  { title: "כרטיסים לאטרקציות מבוקשות", note: "אתרים פופולריים נגמרים או מייצרים תורים ארוכים — הזמנה מראש חוסכת שעות." },
  { title: "סיורים מודרכים בעברית או באנגלית", note: "סיור מקומי טוב הופך את הביקור למשמעותי הרבה יותר מהליכה עצמאית." },
  { title: "מסעדות מבוקשות", note: "במסעדות פופולריות מומלץ להזמין מקום מראש, בעיקר בסופי שבוע ובערב." },
];

export const DESTINATION_BOOKING_TIPS: Record<string, BookingRecommendation[]> = {
  italy: [
    { title: "הקולוסאום ופורום רומאנום", note: "כרטיסים נגמרים מראש בעונת השיא — הזמינו מספר ימים לפני." },
    { title: "מוזיאוני הוותיקן", note: "תור ללא הזמנה יכול לקחת שעות; כרטיס מראש עם שעת כניסה חוסך זמן יקר." },
    { title: "גלריית אופיצי (פירנצה)", note: "אחת האטרקציות המבוקשות באיטליה — הזמנה מראש כמעט חובה." },
  ],
  prague: [
    { title: "טירת פראג", note: "מומלץ להזמין כרטיס משולב מראש כדי לדלג על התור בכניסה." },
    { title: "שיט על נהר הולטבה", note: "שיט ערב עם נוף לגשר קרל מתמלא מהר בעונת התיירות." },
  ],
  copenhagen: [
    { title: "טיבולי גארדנס", note: "בימי חג ובסופי שבוע כדאי לרכוש כרטיס מראש כדי לדלג על התור." },
    { title: "סיור תעלות בקופנהגן", note: "אפשרות נעימה להכיר את העיר מהמים — כדאי להזמין מקום מראש בעונה החמה." },
  ],
  japan: [
    { title: "JR Pass (כרטיס רכבות)", note: "משתלם רק אם נוסעים בין כמה ערים — כדאי לרכוש לפני הטיסה ליפן." },
    { title: "טירת אוסקה / מקדשים מרכזיים בקיוטו", note: "אתרים מרכזיים מתמלאים בעונת הפריחה והסתיו — הזמנה מראש מומלצת." },
    { title: "מסעדות עם תפריט טעימות (אומקאסה)", note: "מקומות איכותיים ביפן דורשים הזמנה מראש, לעיתים שבועות מראש." },
  ],
};

export function getBookingRecommendations(slug: string): BookingRecommendation[] {
  return [...(DESTINATION_BOOKING_TIPS[slug] ?? []), ...GENERAL_BOOKING_TIPS];
}
