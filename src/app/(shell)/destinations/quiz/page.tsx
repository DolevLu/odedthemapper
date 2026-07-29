import { auth } from "@/auth";
import { getAllDestinations } from "@/lib/data/destinations";
import { getUserPurchasedSlugs } from "@/lib/access";
import { QuizForm } from "./QuizForm";

export default async function DestinationQuizPage() {
  const session = await auth();
  const destinations = await getAllDestinations();
  const purchasedSlugs = session?.user?.id ? await getUserPurchasedSlugs(session.user.id) : [];

  const candidates = destinations
    .filter((d) => d.status !== "draft")
    .map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      tagline: d.tagline,
      heroImage: d.heroImage,
    }));

  return (
    <div className="px-6 py-10" style={{ background: "#FBF6EE", minHeight: "100%" }}>
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold">✈️ לאן כדאי לי לטוס?</h1>
          <p className="mt-2 opacity-70">
            ענו על כמה שאלות קצרות, ואנחנו נתאים לכם את היעד הבא שלכם מתוך {candidates.length} היעדים במערכת.
          </p>
        </div>
        <QuizForm candidates={candidates} purchasedSlugs={purchasedSlugs} isLoggedIn={Boolean(session?.user)} />
      </div>
    </div>
  );
}
