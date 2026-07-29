export type PackingCategory = "gear" | "documents" | "before-flight";

export type PackingListItem = { key: string; label: string; category: PackingCategory; couponPartner?: string };

export const PACKING_LIST: PackingListItem[] = [
  // ציוד
  { key: "clothes", label: "בגדים למספר ימי הטיול + שכבה חמה", category: "gear" },
  { key: "shoes", label: "נעליים נוחות להליכה ארוכה", category: "gear" },
  { key: "charger", label: "מטען + מתאם שקע לפי היעד", category: "gear" },
  { key: "powerbank", label: "סוללה ניידת (פאוובנק)", category: "gear" },
  { key: "toiletries", label: "ערכת רחצה בגודל טיסה", category: "gear" },
  { key: "meds", label: "תרופות אישיות + ערכת עזרה ראשונה קטנה", category: "gear" },
  { key: "daypack", label: "תיק יום קטן לטיולים בעיר", category: "gear" },
  { key: "camera", label: "מצלמה / ציוד צילום", category: "gear" },

  // מסמכים
  { key: "passport", label: "דרכון בתוקף (לפחות 6 חודשים קדימה)", category: "documents" },
  { key: "visa", label: "בדיקת צורך בוויזה ליעד", category: "documents" },
  { key: "flight_confirm", label: "אישורי טיסה ומלון (מודפס/דיגיטלי)", category: "documents" },
  { key: "license", label: "רישיון נהיגה בינלאומי (אם מתכננים לנהוג)", category: "documents" },
  { key: "id_copy", label: "צילום/סריקה של דרכון ומסמכים חשובים", category: "documents" },

  // לפני טיסה
  { key: "insurance", label: "ביטוח נסיעות לחו״ל", category: "before-flight", couponPartner: "ביטוח נסיעות (סוכן הביטוח של עודד המנקד)" },
  { key: "esim", label: "סים מקומי או eSIM לאינטרנט בחו״ל", category: "before-flight", couponPartner: "Holafly" },
  { key: "currency", label: "המרת מטבע / כרטיס אשראי מתאים לחו״ל", category: "before-flight" },
  { key: "checkin", label: "צ׳ק אין מקוון לטיסה", category: "before-flight" },
  { key: "notify_bank", label: "עדכון הבנק/חברת האשראי על יציאה לחו״ל", category: "before-flight" },
  { key: "notify_home", label: "תיאום עם מישהו בבית שיודע את פרטי הטיול", category: "before-flight" },
];

export const PACKING_CATEGORY_LABELS: Record<PackingCategory, string> = {
  gear: "ציוד",
  documents: "מסמכים",
  "before-flight": "לפני הטיסה",
};
