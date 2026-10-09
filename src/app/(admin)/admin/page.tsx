'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [stats, setStats] = useState({
    activeMembers: 0,
    awayOnHoliday: 0,
    membersWithCredits: 0,
    outstandingDues: 0,
    breakfast: { expected: 0, skipped: 0, extra: 0, netComing: 0 },
    lunch: { expected: 0, skipped: 0, extra: 0, netComing: 0 },
    dinner: { expected: 0, skipped: 0, extra: 0, netComing: 0 },
  });

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/admin/dashboard-stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handlePopulateDemoData = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        await fetchDashboardData();
        alert('30 Demo Students & Active Subscriptions Created!');
      } else {
        alert('Failed to seed demo data');
      }
    } catch (err) {
      alert('Error running seed');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg text-ink p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
          <div>
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            <p className="text-sm text-ink-2">Live Mess Operations & Headcount</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handlePopulateDemoData}
              disabled={seeding}
              className="px-4 py-2 bg-accent text-white font-medium text-xs rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {seeding ? 'Seeding...' : 'Populate 30 Demo Students'}
            </button>
            <a
              href="/admin-login"
              className="px-4 py-2 bg-surface-2 border border-line text-xs font-medium rounded-xl hover:bg-line transition-colors"
            >
              Sign Out
            </a>
          </div>
        </header>

        {/* Live Meal Headcount Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface p-5 rounded-2xl border border-line">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">Breakfast</span>
              <span className="text-xs text-ink-2">Cutoff 07:00 AM</span>
            </div>
            <div className="mt-2 text-4xl font-bold tracking-tight tabular-nums">{stats.breakfast.netComing}</div>
            <p className="text-xs text-ink-2 mt-2">
              Cook Figure (Net Coming) • {stats.breakfast.expected} Expected, {stats.breakfast.skipped} Skipped
            </p>
          </div>

          <div className="bg-surface p-5 rounded-2xl border border-line">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">Lunch</span>
              <span className="text-xs text-ink-2">Cutoff 11:00 AM</span>
            </div>
            <div className="mt-2 text-4xl font-bold tracking-tight tabular-nums">{stats.lunch.netComing}</div>
            <p className="text-xs text-ink-2 mt-2">
              Cook Figure (Net Coming) • {stats.lunch.expected} Expected, {stats.lunch.skipped} Skipped
            </p>
          </div>

          <div className="bg-surface p-5 rounded-2xl border border-line">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">Dinner</span>
              <span className="text-xs text-ink-2">Cutoff 06:30 PM</span>
            </div>
            <div className="mt-2 text-4xl font-bold tracking-tight tabular-nums">{stats.dinner.netComing}</div>
            <p className="text-xs text-ink-2 mt-2">
              Cook Figure (Net Coming) • {stats.dinner.expected} Expected, {stats.dinner.skipped} Skipped
            </p>
          </div>
        </section>

        {/* Overview Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-surface p-4 rounded-xl border border-line">
            <div className="text-2xl font-bold tabular-nums">{stats.activeMembers}</div>
            <p className="text-xs text-ink-2">Active Members</p>
          </div>
          <div className="bg-surface p-4 rounded-xl border border-line">
            <div className="text-2xl font-bold tabular-nums">{stats.awayOnHoliday}</div>
            <p className="text-xs text-ink-2">Away on Holiday</p>
          </div>
          <div className="bg-surface p-4 rounded-xl border border-line">
            <div className="text-2xl font-bold tabular-nums">{stats.membersWithCredits}</div>
            <p className="text-xs text-ink-2">Members w/ Credits</p>
          </div>
          <div className="bg-surface p-4 rounded-xl border border-line">
            <div className="text-2xl font-bold tabular-nums">₹{stats.outstandingDues}</div>
            <p className="text-xs text-ink-2">Outstanding Dues</p>
          </div>
        </section>
      </div>
    </main>
  );
}
