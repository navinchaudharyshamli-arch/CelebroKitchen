'use client';

import { useState } from 'react';

export default function MemberLoginPage() {
  const [mode, setMode] = useState<'member' | 'forgot'>('member');
  const [memberCode, setMemberCode] = useState('');
  const [pin, setPin] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberCode, pin }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid Member ID or PIN');
      } else {
        window.location.href = '/today';
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: memberCode }),
      });
      setMessage('If an account exists, a 6-digit code was sent to your registered email.');
      setStep('verify');
    } catch {
      setMessage('If an account exists, a 6-digit code was sent to your registered email.');
      setStep('verify');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: memberCode, code: resetCode, newPin }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid reset code or PIN format');
      } else {
        alert('PIN updated successfully! Please sign in.');
        setMode('member');
        setStep('request');
      }
    } catch {
      setError('An error occurred resetting PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-center items-center p-4 bg-bg text-ink">
      <div className="w-full max-w-sm bg-surface p-6 rounded-2xl border border-line shadow-sm space-y-4">
        <h1 className="text-2xl font-semibold text-center mb-1 tracking-tight">Celebro Kitchen</h1>
        <p className="text-xs text-ink-2 text-center mb-4">
          {mode === 'member' ? 'Member Access' : 'Reset PIN'}
        </p>

        {error && (
          <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs rounded-xl text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 bg-ok/10 border border-ok/20 text-ok text-xs rounded-xl text-center">
            {message}
          </div>
        )}

        {mode === 'member' && (
          <form onSubmit={handleMemberLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">Member ID / Phone</label>
              <input
                type="text"
                required
                value={memberCode}
                onChange={(e) => setMemberCode(e.target.value)}
                className="w-full h-12 px-4 bg-surface-2 border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                placeholder="e.g. CK-0001"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">PIN</label>
              <input
                type="password"
                required
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full h-12 px-4 bg-surface-2 border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                placeholder="5-digit PIN"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-accent text-white font-medium text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setStep('request');
                  setError('');
                  setMessage('');
                }}
                className="text-xs text-accent hover:underline"
              >
                Forgot PIN?
              </button>
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <div className="space-y-4">
            {step === 'request' ? (
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">Member ID, Email or Phone</label>
                  <input
                    type="text"
                    required
                    value={memberCode}
                    onChange={(e) => setMemberCode(e.target.value)}
                    className="w-full h-12 px-4 bg-surface-2 border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                    placeholder="e.g. CK-0001"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-accent text-white font-medium text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Sending code...' : 'Send Reset Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">6-Digit Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="w-full h-12 px-4 bg-surface-2 border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                    placeholder="Enter 6-digit code"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">New 5-Digit PIN</label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full h-12 px-4 bg-surface-2 border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                    placeholder="New PIN"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-accent text-white font-medium text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Updating PIN...' : 'Set New PIN'}
                </button>
              </form>
            )}

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('member');
                  setError('');
                  setMessage('');
                }}
                className="text-xs text-ink-2 hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-6 text-[11px] text-ink-2 text-center max-w-xs">
        <p>Data stored: name, ID, phone, email, subscriptions & meals. No photos collected.</p>
      </footer>
    </main>
  );
}
