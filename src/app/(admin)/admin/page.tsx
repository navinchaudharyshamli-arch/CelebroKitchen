'use client';

import { useState } from 'react';

export default function AdminConsolePage() {
  const [activeTab, setActiveTab] = useState<'today' | 'members' | 'money' | 'settings' | 'log'>('today');

  return (
    <main className="min-h-screen bg-bg text-ink p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Tabs */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
          <div>
            <h1 className="text-2xl font-semibold">Admin Console</h1>
            <p className="text-xs text-ink-2">Celebro Kitchen Management</p>
          </div>
          <a
            href="/login"
            className="px-4 py-2 bg-surface-2 border border-line text-xs font-medium rounded-xl hover:bg-line transition-colors self-start sm:self-auto"
          >
            Sign Out
          </a>
        </header>

        {/* Tab Switcher */}
        <nav className="flex space-x-2 border-b border-line pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
              activeTab === 'today' ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2 hover:text-ink'
            }`}
          >
            Today (Dashboard)
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
              activeTab === 'members' ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2 hover:text-ink'
            }`}
          >
            Members
          </button>
          <button
            onClick={() => setActiveTab('money')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
              activeTab === 'money' ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2 hover:text-ink'
            }`}
          >
            Money & Dues
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
              activeTab === 'settings' ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2 hover:text-ink'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('log')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
              activeTab === 'log' ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2 hover:text-ink'
            }`}
          >
            Audit Log
          </button>
        </nav>

        {/* Tab 1: Today Dashboard */}
        {activeTab === 'today' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface p-5 rounded-2xl border border-line">
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">Breakfast</span>
                <div className="mt-2 text-4xl font-bold tracking-tight tabular-nums">0</div>
                <p className="text-xs text-ink-2 mt-2">Cook Figure (Net Coming)</p>
              </div>
              <div className="bg-surface p-5 rounded-2xl border border-line">
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">Lunch</span>
                <div className="mt-2 text-4xl font-bold tracking-tight tabular-nums">0</div>
                <p className="text-xs text-ink-2 mt-2">Cook Figure (Net Coming)</p>
              </div>
              <div className="bg-surface p-5 rounded-2xl border border-line">
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">Dinner</span>
                <div className="mt-2 text-4xl font-bold tracking-tight tabular-nums">0</div>
                <p className="text-xs text-ink-2 mt-2">Cook Figure (Net Coming)</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Members */}
        {activeTab === 'members' && (
          <div className="bg-surface p-6 rounded-2xl border border-line space-y-4">
            <h2 className="text-lg font-semibold">Members Management</h2>
            <p className="text-xs text-ink-2">Member directory, add student, CSV import, and plan amendments.</p>
          </div>
        )}

        {/* Tab 3: Money */}
        {activeTab === 'money' && (
          <div className="bg-surface p-6 rounded-2xl border border-line space-y-4">
            <h2 className="text-lg font-semibold">Money & Dues Ledger</h2>
            <p className="text-xs text-ink-2">Record member payments, UPI/Cash receipts, and dues status.</p>
          </div>
        )}

        {/* Tab 4: Settings */}
        {activeTab === 'settings' && (
          <div className="bg-surface p-6 rounded-2xl border border-line space-y-4">
            <h2 className="text-lg font-semibold">Mess Settings</h2>
            <p className="text-xs text-ink-2">Configure meal names, times, cutoffs, prices, and staff accounts.</p>
          </div>
        )}

        {/* Tab 5: Audit Log */}
        {activeTab === 'log' && (
          <div className="bg-surface p-6 rounded-2xl border border-line space-y-4">
            <h2 className="text-lg font-semibold">Audit Log</h2>
            <p className="text-xs text-ink-2">System change history and CSV exports.</p>
          </div>
        )}
      </div>
    </main>
  );
}
