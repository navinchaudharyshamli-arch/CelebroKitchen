'use client';

import { useState } from 'react';

export default function StudentAppPage() {
  const [activeSheet, setActiveSheet] = useState<'meal' | 'holiday' | 'history' | 'account' | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<{ name: string; date: string; time: string; state: string } | null>(null);

  return (
    <main className="min-h-screen bg-bg text-ink p-4 max-w-md mx-auto space-y-6 pb-20">
      {/* Header & Account Initial */}
      <header className="flex justify-between items-center pt-2">
        <h1 className="text-xl font-semibold tracking-tight">Celebro Kitchen</h1>
        <button
          onClick={() => setActiveSheet('account')}
          className="w-8 h-8 rounded-full bg-surface-2 border border-line flex items-center justify-center text-xs font-semibold text-ink-2"
        >
          AS
        </button>
      </header>

      {/* Summary Numerals */}
      <section className="grid grid-cols-4 gap-2 bg-surface p-3 rounded-2xl border border-line text-center">
        <div>
          <div className="text-lg font-semibold tabular-nums">17</div>
          <p className="text-[11px] text-ink-2">Days left</p>
        </div>
        <div>
          <div className="text-lg font-semibold tabular-nums">32</div>
          <p className="text-[11px] text-ink-2">Taken</p>
        </div>
        <div>
          <div className="text-lg font-semibold tabular-nums">4</div>
          <p className="text-[11px] text-ink-2">Skipped</p>
        </div>
        <div>
          <div className="text-lg font-semibold tabular-nums text-accent">3</div>
          <p className="text-[11px] text-ink-2">Credits</p>
        </div>
      </section>

      {/* Vertical Habit-Tracker Calendar Grid */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-2 text-xs text-ink-2">
          <span className="font-medium">Current Week</span>
          <div className="flex space-x-6">
            <button onClick={() => setActiveSheet('holiday')} className="text-accent font-medium hover:underline">
              Mark Holiday
            </button>
            <button onClick={() => setActiveSheet('history')} className="text-ink-2 hover:underline">
              History
            </button>
          </div>
        </div>

        {/* Date Strips with Vertical Columns */}
        <div className="bg-surface p-4 rounded-2xl border border-line space-y-4">
          {/* Header Labels */}
          <div className="flex justify-between items-center text-xs text-ink-2 font-medium border-b border-line pb-2">
            <span>Day</span>
            <div className="flex space-x-8 pr-3">
              <span>B</span>
              <span>L</span>
              <span>D</span>
            </div>
          </div>

          {/* Wednesday 16 */}
          <div className="flex justify-between items-center">
            <div className="text-xs">
              <span className="text-ink-2 block">Wed</span>
              <span className="font-semibold text-sm">16</span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setSelectedMeal({ name: 'Breakfast', date: 'Wed, 16 Oct', time: '08:00 AM - 09:30 AM', state: 'taken' });
                  setActiveSheet('meal');
                }}
                className="w-12 h-12 rounded-xl bg-ok border border-ok flex items-center justify-center text-white font-semibold text-xs"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setSelectedMeal({ name: 'Lunch', date: 'Wed, 16 Oct', time: '12:00 PM - 01:30 PM', state: 'skipped' });
                  setActiveSheet('meal');
                }}
                className="w-12 h-12 rounded-xl bg-skip-soft border border-skip/30 flex items-center justify-center text-skip font-semibold text-xs"
              >
                +1
              </button>
              <button
                onClick={() => {
                  setSelectedMeal({ name: 'Dinner', date: 'Wed, 16 Oct', time: '07:30 PM - 09:00 PM', state: 'taken' });
                  setActiveSheet('meal');
                }}
                className="w-12 h-12 rounded-xl bg-ok border border-ok flex items-center justify-center text-white font-semibold text-xs"
              >
                ✓
              </button>
            </div>
          </div>

          {/* Thursday 17 (Today Highlighted) */}
          <div className="flex justify-between items-center bg-surface-2/60 p-2 rounded-xl border border-accent/30">
            <div className="text-xs pl-1">
              <span className="text-accent font-semibold block">Thu</span>
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-accent text-white font-semibold text-xs">
                17
              </span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setSelectedMeal({ name: 'Breakfast', date: 'Thu, 17 Oct', time: '08:00 AM - 09:30 AM', state: 'taken' });
                  setActiveSheet('meal');
                }}
                className="w-12 h-12 rounded-xl bg-ok border border-ok flex items-center justify-center text-white font-semibold text-xs"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setSelectedMeal({ name: 'Lunch', date: 'Thu, 17 Oct', time: '12:00 PM - 01:30 PM', state: 'upcoming' });
                  setActiveSheet('meal');
                }}
                className="w-12 h-12 rounded-xl bg-ok-soft border border-ok/30 flex items-center justify-center text-ok font-semibold text-xs"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setSelectedMeal({ name: 'Dinner', date: 'Thu, 17 Oct', time: '07:30 PM - 09:00 PM', state: 'empty' });
                  setActiveSheet('meal');
                }}
                className="w-12 h-12 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-ink-2 font-semibold text-xs"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Sheet Overlay */}
      {activeSheet && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex flex-col justify-end z-50">
          <div className="bg-surface rounded-t-3xl p-6 space-y-4 max-w-md mx-auto w-full border-t border-line">
            <div className="w-12 h-1 bg-line rounded-full mx-auto mb-2" />

            {/* Meal Action Sheet */}
            {activeSheet === 'meal' && selectedMeal && (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedMeal.name}</h2>
                    <p className="text-xs text-ink-2">{selectedMeal.date}</p>
                  </div>
                  <span className="px-3 py-1 bg-surface-2 border border-line text-xs font-medium rounded-xl">
                    {selectedMeal.time}
                  </span>
                </div>

                <div className="text-xs text-ink-2 flex items-center space-x-1">
                  <span>⏱ Skip available until 11:00 AM, 42 min left</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => {
                      alert('Meal Skipped! +1 Credit Added');
                      setActiveSheet(null);
                    }}
                    className="py-3 bg-surface-2 border border-line text-ink text-sm font-medium rounded-xl hover:bg-line"
                  >
                    Skip Meal
                  </button>
                  <button
                    onClick={() => setActiveSheet(null)}
                    className="py-3 bg-accent text-white text-sm font-medium rounded-xl hover:opacity-90"
                  >
                    Confirm Taken
                  </button>
                </div>
              </div>
            )}

            {/* Holiday Sheet */}
            {activeSheet === 'holiday' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Mark Holiday</h2>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-ink-2 mb-1">Start Date</label>
                    <input type="date" className="w-full p-3 bg-surface-2 border border-line rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-ink-2 mb-1">End Date</label>
                    <input type="date" className="w-full p-3 bg-surface-2 border border-line rounded-xl" />
                  </div>
                  <div className="p-3 bg-ok-soft/40 border border-ok/20 rounded-xl text-ok">
                    Preview: 15 skippable meals, +15 credits to be granted.
                  </div>
                </div>
                <button
                  onClick={() => {
                    alert('Holiday Marked Successfully!');
                    setActiveSheet(null);
                  }}
                  className="w-full py-3 bg-accent text-white font-medium text-sm rounded-xl"
                >
                  Confirm Holiday
                </button>
              </div>
            )}

            {/* Account Sheet */}
            {activeSheet === 'account' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Account & Settings</h2>
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-surface-2 rounded-xl flex justify-between">
                    <span>Plan Type</span>
                    <span className="font-semibold">Monthly Full Mess</span>
                  </div>
                  <div className="p-3 bg-surface-2 rounded-xl flex justify-between">
                    <span>Outstanding Dues</span>
                    <span className="font-semibold text-ok">₹0 (Paid)</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveSheet(null)}
                  className="w-full py-3 bg-surface-2 border border-line font-medium text-xs rounded-xl"
                >
                  Close
                </button>
              </div>
            )}

            {/* History Sheet */}
            {activeSheet === 'history' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Attendance & Ledger History</h2>
                <div className="space-y-2 text-xs max-h-48 overflow-y-auto">
                  <div className="p-3 bg-surface-2 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="block font-medium">Lunch Skipped</span>
                      <span className="text-[10px] text-ink-2">Wed, 16 Oct</span>
                    </div>
                    <span className="text-accent font-semibold">+1 Credit</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveSheet(null)}
                  className="w-full py-3 bg-surface-2 border border-line font-medium text-xs rounded-xl"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
