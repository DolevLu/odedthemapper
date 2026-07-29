export default function OfflinePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-bold">אין חיבור לאינטרנט</h1>
      <p className="max-w-sm opacity-70">
        העמוד הזה עדיין לא נטען מראש למצב אופליין. בקרו בו פעם אחת כשיש חיבור כדי שיהיה זמין גם בלי אינטרנט.
      </p>
    </div>
  );
}
