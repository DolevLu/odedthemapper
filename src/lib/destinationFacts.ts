export type DestinationFacts = {
  countryCode: string; // ISO 3166-1 alpha-2 — reused for flag emoji + the visited-countries map
  timezone: string; // IANA zone
  plug: string;
  voltage: string;
  visaForIsraeli: string;
  tipping: string;
  emergency: string;
};

/** Static reference facts per destination — timezone for the home/local
 * time widget, plug/voltage/visa/tipping for the "Now" screen's quick-facts
 * card, emergency numbers for the emergency card. General guidance, not
 * legal/official advice — worth a light disclaimer in the UI, not meant to
 * replace checking official sources for anything visa-related. USA's
 * timezone is a single approximation (America/New_York) since it genuinely
 * spans multiple zones. */
export const DESTINATION_FACTS: Record<string, DestinationFacts> = {
  argentina: { countryCode: "AR", timezone: "America/Argentina/Buenos_Aires", plug: "C / I", voltage: "220V", visaForIsraeli: "ללא צורך בוויזה עד 90 יום", tipping: "כ-10% במסעדות מקובל", emergency: "911" },
  austria: { countryCode: "AT", timezone: "Europe/Vienna", plug: "C / F", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה (שנגן)", tipping: "עיגול חשבון או כ-10%", emergency: "112" },
  budapest: { countryCode: "HU", timezone: "Europe/Budapest", plug: "C / F", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה (שנגן)", tipping: "כ-10%", emergency: "112" },
  cambodia: { countryCode: "KH", timezone: "Asia/Phnom_Penh", plug: "A / C / G", voltage: "230V", visaForIsraeli: "נדרשת ויזה (e-Visa מראש או בהגעה)", tipping: "לא חובה, מקובל לעגל", emergency: "117 (משטרה) / 119 (אמבולנס)" },
  china: { countryCode: "CN", timezone: "Asia/Shanghai", plug: "A / C / I", voltage: "220V", visaForIsraeli: "נדרשת ויזה מראש", tipping: "לא נהוג לתת טיפ", emergency: "110 (משטרה) / 120 (אמבולנס)" },
  copenhagen: { countryCode: "DK", timezone: "Europe/Copenhagen", plug: "C / F / K", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה (שנגן)", tipping: "לא חובה, כלול בד״כ בחשבון", emergency: "112" },
  croatia: { countryCode: "HR", timezone: "Europe/Zagreb", plug: "C / F", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה (שנגן)", tipping: "כ-10%", emergency: "112" },
  cyprus: { countryCode: "CY", timezone: "Asia/Nicosia", plug: "G", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה", tipping: "כ-10%", emergency: "112" },
  dubai: { countryCode: "AE", timezone: "Asia/Dubai", plug: "C / G / D", voltage: "230V", visaForIsraeli: "ויזה בהגעה / e-Visa מראש", tipping: "כ-10% אם לא כלול שירות", emergency: "999 (משטרה) / 998 (אמבולנס)" },
  england: { countryCode: "GB", timezone: "Europe/London", plug: "G", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה עד 6 חודשים", tipping: "10-12.5% אם לא כלול", emergency: "999" },
  france: { countryCode: "FR", timezone: "Europe/Paris", plug: "C / E", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה (שנגן)", tipping: "כלול בחשבון, עיגול קטן מקובל", emergency: "112" },
  greece: { countryCode: "GR", timezone: "Europe/Athens", plug: "C / F", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה (שנגן)", tipping: "5-10%", emergency: "112" },
  israel: { countryCode: "IL", timezone: "Asia/Jerusalem", plug: "C / H / M", voltage: "230V", visaForIsraeli: "-", tipping: "12% שירות כלול לרוב, אפשר להוסיף", emergency: "100 (משטרה) / 101 (מד״א) / 102 (כבאות)" },
  italy: { countryCode: "IT", timezone: "Europe/Rome", plug: "C / F / L", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה (שנגן)", tipping: "לא חובה, coperto לרוב כלול", emergency: "112" },
  japan: { countryCode: "JP", timezone: "Asia/Tokyo", plug: "A / B", voltage: "100V", visaForIsraeli: "ללא צורך בוויזה עד 90 יום", tipping: "לא נהוג - יכול אף להתקבל כפוגעני", emergency: "110 (משטרה) / 119 (אמבולנס/כבאות)" },
  korea: { countryCode: "KR", timezone: "Asia/Seoul", plug: "C / F", voltage: "220V", visaForIsraeli: "ללא צורך בוויזה עד 90 יום (נדרש K-ETA)", tipping: "לא נהוג לתת טיפ", emergency: "112 (משטרה) / 119 (אמבולנס)" },
  laos: { countryCode: "LA", timezone: "Asia/Vientiane", plug: "A / B / C", voltage: "230V", visaForIsraeli: "נדרשת ויזה (ניתן בהגעה)", tipping: "לא חובה, מקובל לעגל", emergency: "191 (משטרה) / 195 (אמבולנס)" },
  netherlands: { countryCode: "NL", timezone: "Europe/Amsterdam", plug: "C / F", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה (שנגן)", tipping: "עיגול קטן מקובל", emergency: "112" },
  norway: { countryCode: "NO", timezone: "Europe/Oslo", plug: "C / F", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה (שנגן)", tipping: "לא חובה, כלול בחשבון", emergency: "112" },
  philippines: { countryCode: "PH", timezone: "Asia/Manila", plug: "A / B / C", voltage: "220V", visaForIsraeli: "ללא צורך בוויזה עד 30 יום", tipping: "כ-10% אם לא כלול", emergency: "911" },
  poland: { countryCode: "PL", timezone: "Europe/Warsaw", plug: "C / E", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה (שנגן)", tipping: "כ-10%", emergency: "112" },
  portugal: { countryCode: "PT", timezone: "Europe/Lisbon", plug: "C / F", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה (שנגן)", tipping: "5-10%", emergency: "112" },
  prague: { countryCode: "CZ", timezone: "Europe/Prague", plug: "C / E", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה (שנגן)", tipping: "כ-10%", emergency: "112" },
  romania: { countryCode: "RO", timezone: "Europe/Bucharest", plug: "C / F", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה (שנגן)", tipping: "כ-10%", emergency: "112" },
  singapore: { countryCode: "SG", timezone: "Asia/Singapore", plug: "G", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה עד 30 יום", tipping: "לרוב כלול, לא נהוג להוסיף", emergency: "999 (משטרה) / 995 (אמבולנס)" },
  spain: { countryCode: "ES", timezone: "Europe/Madrid", plug: "C / F", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה (שנגן)", tipping: "לא חובה, עיגול קטן", emergency: "112" },
  sweden: { countryCode: "SE", timezone: "Europe/Stockholm", plug: "C / F", voltage: "230V", visaForIsraeli: "ללא צורך בוויזה (שנגן)", tipping: "לא חובה, כלול בחשבון", emergency: "112" },
  tanzania: { countryCode: "TZ", timezone: "Africa/Dar_es_Salaam", plug: "D / G", voltage: "230V", visaForIsraeli: "נדרשת ויזה (ניתן e-Visa מראש)", tipping: "מקובל ואף מצופה, כ-10%", emergency: "112 / 999" },
  thailand: { countryCode: "TH", timezone: "Asia/Bangkok", plug: "A / B / C", voltage: "220V", visaForIsraeli: "ללא צורך בוויזה עד 30 יום", tipping: "לא חובה, עיגול/כ-10% מוערך", emergency: "191 (משטרה) / 1669 (אמבולנס)" },
  usa: { countryCode: "US", timezone: "America/New_York", plug: "A / B", voltage: "120V", visaForIsraeli: "נדרשת אישור ESTA מראש", tipping: "15-20% - כמעט תמיד מצופה", emergency: "911" },
  vietnam: { countryCode: "VN", timezone: "Asia/Ho_Chi_Minh", plug: "A / C", voltage: "220V", visaForIsraeli: "נדרשת ויזה (e-Visa מראש)", tipping: "לא חובה, מוערך במסעדות לתיירים", emergency: "113 (משטרה) / 115 (אמבולנס)" },
};
