'use client';

import { useState } from 'react';

export default function StudentDashboardPage() {
  return (
    <main className="min-h-screen bg-bg text-ink p-4 max-w-md mx-auto space-y-6">
      {/* Header & Monogram Wordmark */}
      <header className="flex justify-between items-center pt-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Celebro Kitchen</h1>
          <p className="text-xs text-ink-2">Tap a meal to skip it.</p>
        </div>
        <a href="/me" className="px-3 py-1.5 bg-surface border border-line text-xs font-medium rounded-xl">
          Account
        </a>
      </header>

      {/* Summary Numerals */}
      <section className="grid grid-cols-4 gap-2 bg-surface p-3 rounded-2xl border border-line text-center">
        <div>
          <div className="text-lg font-semibold tabular-nums">24</div>
          <p className="text-[11px] text-ink-2">Days left</p>
        </div>
        <div>
          <div className="text-lg font-semibold tabular-nums">6</div>
          <p className="text-[11px] text-ink-2">Taken</p>
        </div>
        <div>
          <div className="text-lg font-semibold tabular-nums">1</div>
          <p className="text-[11px] text-ink-2">Skipped</p>
        </div>
        <div>
          <div className="text-lg font-semibold tabular-nums text-accent">1</div>
          <p className="text-[11px] text-ink-2">Credits</p>
        </div>
      </section>

      {/* Habit Tracker Calendar Grid */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1 text-xs text-ink-2 font-medium">
          <span>Current Week</span>
          <div className="flex space-x-6 text-[11px] uppercase tracking-wider pr-2">
            <span>B</span>
            <span>L</span>
            <span>D</span>
          </div>
        </div>

        {/* Day Rows */}
        <div className="space-y-2">
          {/* Today Row */}
          <div className="flex items-center justify-between bg-surface p-3 rounded-2xl border border-line">
            <div className="flex items-center space-x-2">
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-accent text-white font-semibold text-xs">
                10
              </span>
              <span className="text-sm font-medium">Today</span>
            </div>
            <div className="flex space-x-2">
              <button className="w-11 h-11 rounded-xl bg-ok-soft border border-ok/30 flex items-center justify-center text-ok font-semibold text-xs">
                ✓
              </button>
              <button className="w-11 h-11 rounded-xl bg-ok-soft border border-ok/30 flex items-center justify-center text-ok font-semibold text-xs">
                ✓
              </button>
              <button className="w-11 h-11 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-ink-2 font-semibold text-xs">
                +
              </button>
            </div>
          </div>

          {/* Tomorrow Row */}
          <div className="flex items-center justify-between bg-surface p-3 rounded-2xl border border-line">
            <div className="flex items-center space-x-2">
              <span className="w-7 text-center text-xs font-medium text-ink-2">11</span>
              <span className="text-sm font-medium">Sun</span>
            </div>
            <div className="flex space-x-2">
              <button className="w-11 h-11 rounded-xl bg-ok-soft border border-ok/30 flex items-center justify-center text-ok font-semibold text-xs">
                ✓
              </button>
              <button className="w-11 h-11 rounded-xl bg-skip-soft border border-skip/30 flex items-center justify-center text-skip font-semibold text-xs">
                +1
              </button>
              <button className="w-11 h-11 rounded-xl bg-ok-soft border border-ok/30 flex items-center justify-center text-ok font-semibold text-xs">
                ✓
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Action Button */}
      <div className="pt-2">
        <a
          href="/skip/next"
          className="block w-full py-3 bg-accent text-white text-center font-medium rounded-xl hover:opacity-90 transition-opacity"
        >
          Skip Next Meal
        </a>
      </div>
    </main>
  );
}
