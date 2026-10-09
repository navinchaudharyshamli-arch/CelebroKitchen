'use client';

export default function KitchenPage() {
  return (
    <main className="min-h-screen bg-bg text-ink p-4 max-w-lg mx-auto space-y-6">
      <header className="flex justify-between items-center pb-3 border-b border-line">
        <div>
          <h1 className="text-xl font-semibold">Kitchen Counter</h1>
          <p className="text-xs text-ink-2">Staff Operations</p>
        </div>
        <span className="px-3 py-1 bg-accent/10 border border-accent/20 text-accent font-semibold text-xs rounded-xl">
          Lunch (Live)
        </span>
      </header>

      {/* Big Cook Headcount */}
      <section className="bg-surface p-6 rounded-2xl border border-line text-center">
        <span className="text-xs font-semibold text-ink-2 uppercase tracking-wider">Cook Figure (Net Coming)</span>
        <div className="text-5xl font-bold tracking-tight text-ink mt-2 tabular-nums">0</div>
        <p className="text-xs text-ink-2 mt-2">0 Expected • 0 Extras • 0 Skipped</p>
      </section>

      {/* Staff Queues */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-ok mb-2 flex items-center justify-between">
            <span>Expected (Serve)</span>
            <span className="text-xs text-ink-2 font-normal">0 members</span>
          </h2>
          <div className="bg-surface p-4 rounded-xl border border-line text-xs text-ink-2 text-center">
            No expected members for this meal yet.
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-skip mb-2 flex items-center justify-between">
            <span>Skipped (Do Not Serve)</span>
            <span className="text-xs text-ink-2 font-normal">0 members</span>
          </h2>
          <div className="bg-skip-soft/40 p-4 rounded-xl border border-skip/20 text-xs text-ink-2 text-center">
            No skips recorded.
          </div>
        </div>
      </section>
    </main>
  );
}
