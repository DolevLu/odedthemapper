import Link from "next/link";
import { Suspense } from "react";
import { getAllDestinations } from "@/lib/data/destinations";
import { DestinationsBrowser } from "@/components/DestinationsBrowser";
import { DestinationsGridSkeleton } from "@/components/DestinationsGridSkeleton";

async function DestinationsBrowserSection() {
  const destinations = await getAllDestinations();
  return <DestinationsBrowser destinations={destinations} />;
}

export default function DestinationsPage() {
  return (
    <div className="px-6 py-10" style={{ background: "#FBF6EE", minHeight: "100%" }}>
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="mb-2 text-2xl font-extrabold">כל היעדים</h1>
        <p className="mb-6 opacity-70">בחרו יעד כדי להיכנס למערכת שלו - מפה, מסלול, שיחון ועוד.</p>

        <Link
          href="/destinations/quiz"
          className="mb-8 flex flex-col items-start gap-2 rounded-3xl p-6 text-white shadow-md sm:flex-row sm:items-center sm:justify-between"
          style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
        >
          <div>
            <p className="text-lg font-extrabold">✈️ לא בטוחים לאן לטוס?</p>
            <p className="text-sm opacity-90">ענו על שאלון קצר ואנחנו נתאים לכם את היעד הבא - בחינם.</p>
          </div>
          <span className="rounded-full bg-white px-5 py-2.5 font-bold" style={{ color: "#7C3AED" }}>
            למצוא לי יעד ←
          </span>
        </Link>

        <Suspense fallback={<DestinationsGridSkeleton />}>
          <DestinationsBrowserSection />
        </Suspense>
      </div>
    </div>
  );
}
