export type PackingCategory = "gear" | "documents" | "before-flight";

export type PackingListItem = { key: string; label: { he: string; en: string }; category: PackingCategory; couponPartner?: string };

export const PACKING_LIST: PackingListItem[] = [
  // Gear
  { key: "clothes", label: { he: "בגדים למספר ימי הטיול + שכבה חמה", en: "Clothes for the trip days + a warm layer" }, category: "gear" },
  { key: "shoes", label: { he: "נעליים נוחות להליכה ארוכה", en: "Comfortable shoes for long walking" }, category: "gear" },
  { key: "charger", label: { he: "מטען + מתאם שקע לפי היעד", en: "Charger + plug adapter for the destination" }, category: "gear" },
  { key: "powerbank", label: { he: "סוללה ניידת (פאוובנק)", en: "Portable battery (power bank)" }, category: "gear" },
  { key: "toiletries", label: { he: "ערכת רחצה בגודל טיסה", en: "Travel-size toiletries kit" }, category: "gear" },
  { key: "meds", label: { he: "תרופות אישיות + ערכת עזרה ראשונה קטנה", en: "Personal medication + a small first-aid kit" }, category: "gear" },
  { key: "daypack", label: { he: "תיק יום קטן לטיולים בעיר", en: "A small daypack for exploring the city" }, category: "gear" },
  { key: "camera", label: { he: "מצלמה / ציוד צילום", en: "Camera / photo gear" }, category: "gear" },

  // Documents
  { key: "passport", label: { he: "דרכון בתוקף (לפחות 6 חודשים קדימה)", en: "Valid passport (at least 6 months ahead)" }, category: "documents" },
  { key: "visa", label: { he: "בדיקת צורך בוויזה ליעד", en: "Check whether the destination requires a visa" }, category: "documents" },
  { key: "flight_confirm", label: { he: "אישורי טיסה ומלון (מודפס/דיגיטלי)", en: "Flight and hotel confirmations (printed/digital)" }, category: "documents" },
  { key: "license", label: { he: "רישיון נהיגה בינלאומי (אם מתכננים לנהוג)", en: "International driving license (if planning to drive)" }, category: "documents" },
  { key: "id_copy", label: { he: "צילום/סריקה של דרכון ומסמכים חשובים", en: "A photo/scan of your passport and important documents" }, category: "documents" },

  // Before the flight
  {
    key: "insurance",
    label: { he: "ביטוח נסיעות לחו״ל", en: "Travel insurance" },
    category: "before-flight",
    couponPartner: "ביטוח נסיעות (סוכן הביטוח של טראבי)",
  },
  { key: "esim", label: { he: "סים מקומי או eSIM לאינטרנט בחו״ל", en: "A local SIM or eSIM for internet abroad" }, category: "before-flight", couponPartner: "Holafly" },
  { key: "currency", label: { he: "המרת מטבע / כרטיס אשראי מתאים לחו״ל", en: "Currency exchange / a credit card suited for abroad" }, category: "before-flight" },
  { key: "checkin", label: { he: "צ׳ק אין מקוון לטיסה", en: "Online flight check-in" }, category: "before-flight" },
  { key: "notify_bank", label: { he: "עדכון הבנק/חברת האשראי על יציאה לחו״ל", en: "Notify your bank/credit card company about traveling abroad" }, category: "before-flight" },
  { key: "notify_home", label: { he: "תיאום עם מישהו בבית שיודע את פרטי הטיול", en: "Arrange for someone back home to know your trip details" }, category: "before-flight" },
];

export const PACKING_CATEGORY_LABELS: Record<PackingCategory, { he: string; en: string }> = {
  gear: { he: "ציוד", en: "Gear" },
  documents: { he: "מסמכים", en: "Documents" },
  "before-flight": { he: "לפני הטיסה", en: "Before the flight" },
};
