import Link from "next/link";
import { STARTER_THEMES } from "@/lib/theme/starterThemes";
import { NewDestinationForm } from "./NewDestinationForm";

export default function NewDestinationPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin" className="text-sm underline opacity-60">
        ← חזרה ליעדים
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">הוספת יעד חדש</h1>
      <div className="rounded-xl border border-black/10 bg-white p-5">
        <NewDestinationForm starterThemes={STARTER_THEMES} />
      </div>
    </div>
  );
}
