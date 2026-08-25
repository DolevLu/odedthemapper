import Link from "next/link";
import { auth } from "@/auth";
import { DeleteAccountForm } from "./DeleteAccountForm";

export const metadata = { title: "מחיקת חשבון | עודד המנקד" };

/** Standalone, publicly reachable URL (no app chrome) — this is the "Delete
 * account" link Google Play's Data Safety form requires for any app that
 * supports account creation. Actually deleting requires being signed in
 * (there's no way to safely delete someone else's account from a public
 * page), which Google's own policy explicitly allows — the URL itself just
 * needs to be reachable without the app installed. */
export default async function DeleteAccountPage() {
  const session = await auth();

  return (
    <div dir="rtl" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12 text-sm leading-relaxed">
      <Link href="/" className="text-sm font-semibold opacity-60 hover:opacity-100">
        ← חזרה לדף הבית
      </Link>

      <div>
        <h1 className="mb-1 text-2xl font-bold">מחיקת חשבון</h1>
        <p className="text-xs opacity-50">עודד המנקד</p>
      </div>

      <p>
        ניתן לבקש מחיקה מלאה של החשבון שלכם וכל המידע הקשור אליו מהאפליקציה בכל עת. הבקשה מטופלת מיד עם האישור —
        אין צורך להמתין או לפנות אלינו בנפרד.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">מה נמחק</h2>
        <ul className="flex list-inside list-disc flex-col gap-1">
          <li>פרטי החשבון שלכם (שם, אימייל, פרטי התחברות)</li>
          <li>כל המנויים והרכישות שלכם במערכת</li>
          <li>מסלולים, הוצאות, מועדפים, ופרטי לוגיסטיקה שנשמרו</li>
          <li>תמונות שהעליתם (אלבום, מדינות שביקרתם בהן)</li>
          <li>נקודות ורמות, קופוני הפניה, ותוצאות חידונים</li>
        </ul>
        <p className="text-xs opacity-60">
          המחיקה היא מיידית ובלתי הפיכה. אם יש לכם מנוי פעיל בתשלום, המחיקה גם מבטלת אותו — לא תחויבו שוב.
        </p>
      </section>

      {session?.user?.email ? (
        <section className="flex flex-col items-start gap-3 border-t pt-6" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
          <p className="text-sm opacity-70">
            מחוברים כ־<strong>{session.user.email}</strong>
          </p>
          <DeleteAccountForm email={session.user.email} />
        </section>
      ) : (
        <section className="flex flex-col items-start gap-3 border-t pt-6" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
          <p className="text-sm opacity-70">כדי למחוק את החשבון שלכם, יש להתחבר תחילה.</p>
          <Link
            href="/login?callbackUrl=/delete-account"
            className="rounded-full px-6 py-3 text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
          >
            התחברות
          </Link>
        </section>
      )}

      <p className="text-xs opacity-50">
        לשאלות בנוגע למחיקת החשבון ניתן גם לפנות אלינו בכתובת{" "}
        <a href="mailto:support@odedthemapper.com" className="underline">
          support@odedthemapper.com
        </a>
        .
      </p>
    </div>
  );
}
