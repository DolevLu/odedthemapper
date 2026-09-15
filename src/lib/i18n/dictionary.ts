export type Lang = "he" | "en";

/** Free, static UI-text dictionary (no translation API) — keyed by short
 * dotted keys, each with a Hebrew and English value. Only UI chrome/labels
 * go here, never database content (destination names, POI names/descriptions
 * stay in their original language regardless of this toggle — see the
 * language settings answer this was scoped to). */
export const DICTIONARY = {
  "nav.home": { he: "דף הבית", en: "Home" },
  "nav.destinations": { he: "יעדים", en: "Destinations" },
  "nav.myTrips": { he: "הטיולים שלי", en: "My Trips" },
  "nav.downloadApp": { he: "הורידו את האפליקציה", en: "Download the app" },
  "nav.adminPanel": { he: "פאנל אדמין", en: "Admin Panel" },
  "nav.privacyPolicy": { he: "מדיניות פרטיות", en: "Privacy Policy" },
  "nav.upgradeNow": { he: "שדרג עכשיו", en: "Upgrade Now" },
  "nav.more": { he: "עוד", en: "More" },
  "nav.close": { he: "סגירה", en: "Close" },

  "group.tripPlanning": { he: "תכנון הטיול", en: "Trip Planning" },
  "group.duringTrip": { he: "במהלך הטיול", en: "During the Trip" },
  "group.clientTools": { he: "כלים ללקוחות", en: "Client Tools" },
  "group.helpersMemories": { he: "עזרים וזיכרונות", en: "Tools & Memories" },

  "item.now": { he: "מה עכשיו", en: "What's Now" },
  "item.map": { he: "מפה", en: "Map" },
  "item.itinerary": { he: "מסלול", en: "Itinerary" },
  "item.favorites": { he: "מועדפים והטבות", en: "Favorites & Perks" },
  "item.bookable": { he: "להזמנה", en: "Bookable" },
  "item.logistics": { he: "לוגיסטיקה", en: "Logistics" },
  "item.expenses": { he: "הוצאות", en: "Expenses" },
  "item.clientPlanner": { he: "תכנון מסלול ללקוח", en: "Client Itinerary Planner" },
  "item.crm": { he: "CRM", en: "CRM" },
  "item.weather": { he: "מזג אוויר", en: "Weather" },
  "item.quiz": { he: "חידונים", en: "Quizzes" },
  "item.phrasebook": { he: "שיחון", en: "Phrasebook" },
  "item.packing": { he: "ציוד וצ׳ק ליסט", en: "Packing & Checklist" },
  "item.album": { he: "אלבום", en: "Album" },

  "popup.chooseDestinationFirst": { he: "בחרו יעד קודם", en: "Choose a destination first" },
  "popup.chooseDestinationBody": {
    he: 'כדי לגשת למסך הזה, בחרו קודם יעד מתוך "יעדים".',
    en: 'To access this screen, first choose a destination from "Destinations".',
  },
  "popup.selectDestination": { he: "לבחירת יעד", en: "Select a destination" },

  "settings.title": { he: "⚙️ הגדרות", en: "⚙️ Settings" },
  "settings.appearance": { he: "מראה", en: "Appearance" },
  "settings.light": { he: "בהיר", en: "Light" },
  "settings.dark": { he: "כהה", en: "Dark" },
  "settings.system": { he: "מערכת", en: "System" },
  "settings.textSize": { he: "גודל טקסט", en: "Text Size" },
  "settings.small": { he: "קטן", en: "Small" },
  "settings.regular": { he: "רגיל", en: "Regular" },
  "settings.large": { he: "גדול", en: "Large" },
  "settings.language": { he: "שפה", en: "Language" },
  "settings.hebrew": { he: "עברית", en: "Hebrew" },
  "settings.english": { he: "אנגלית", en: "English" },

  "notif.title": { he: "התראות", en: "Notifications" },
  "notif.enabled": { he: "✓ מופעל", en: "✓ Enabled" },
  "notif.defaultDesc": { he: "תזכורות צ׳ק-אין לטיסות והתראות תקציב, ישירות למכשיר שלכם.", en: "Flight check-in reminders and budget alerts, straight to your device." },
  "notif.deniedDesc": {
    he: 'חסמתם התראות בדפדפן לאתר הזה. לחצו על סמל המנעול 🔒 שליד כתובת האתר, פתחו "הרשאות אתר" (Notifications), שנו לאפשר, ואז לחצו "בדקו שוב" למטה.',
    en: 'You’ve blocked notifications for this site in your browser. Click the 🔒 lock icon next to the address bar, open Site settings → Notifications, set it to Allow, then click "Check again" below.',
  },
  "notif.checkAgain": { he: "בדקו שוב", en: "Check again" },
  "notif.enableBtn": { he: "הפעלת התראות", en: "Enable notifications" },
  "notif.disableBtn": { he: "כיבוי התראות", en: "Turn off notifications" },
  "notif.missingConfigError": { he: "התראות לא מוגדרות כרגע באתר. נסו שוב מאוחר יותר.", en: "Notifications aren't configured on the site right now. Try again later." },
  "notif.subscribeFailedError": {
    he: "הפעלת ההתראות נכשלה. ודאו שהתראות מאושרות למכשיר/דפדפן ונסו שוב.",
    en: "Enabling notifications failed. Make sure notifications are allowed for this device/browser and try again.",
  },
} satisfies Record<string, Record<Lang, string>>;

export type DictionaryKey = keyof typeof DICTIONARY;
