'use client';

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-bg text-ink p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-center pb-4 border-b border-line">
          <div>
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            <p className="text-sm text-ink-2">Celebro Kitchen Management</p>
          </div>
          <a
            href="/admin-login"
            className="px-4 py-2 bg-surface-2 border border-line text-sm rounded-xl hover:bg-line transition-colors"
          >
            Sign Out
          </a>
        </header>

        {/* Meal Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface p-5 rounded-2xl border border-line">
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">Breakfast</span>
            <div className="mt-2 text-3xl font-semibold tracking-tight">0</div>
            <p className="text-xs text-ink-2 mt-1">Coming (Net) • Cutoff 07:00 AM</p>
          </div>
          <div className="bg-surface p-5 rounded-2xl border border-line">
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">Lunch</span>
            <div className="mt-2 text-3xl font-semibold tracking-tight">0</div>
            <p className="text-xs text-ink-2 mt-1">Coming (Net) • Cutoff 11:00 AM</p>
          </div>
          <div className="bg-surface p-5 rounded-2xl border border-line">
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">Dinner</span>
            <div className="mt-2 text-3xl font-semibold tracking-tight">0</div>
            <p className="text-xs text-ink-2 mt-1">Coming (Net) • Cutoff 06:30 PM</p>
          </div>
        </section>

        {/* Overview Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-surface p-4 rounded-xl border border-line">
            <div className="text-2xl font-semibold">0</div>
            <p className="text-xs text-ink-2">Active Members</p>
          </div>
          <div className="bg-surface p-4 rounded-xl border border-line">
            <div className="text-2xl font-semibold">0</div>
            <p className="text-xs text-ink-2">Away on Holiday</p>
          </div>
          <div className="bg-surface p-4 rounded-xl border border-line">
            <div className="text-2xl font-semibold">0</div>
            <p className="text-xs text-ink-2">Members w/ Credits</p>
          </div>
          <div className="bg-surface p-4 rounded-xl border border-line">
            <div className="text-2xl font-semibold">₹0</div>
            <p className="text-xs text-ink-2">Outstanding Dues</p>
          </div>
        </section>
      </div>
    </main>
  );
}
