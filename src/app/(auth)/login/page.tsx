'use client';

import { useState } from 'react';

export default function UnifiedLoginPage() {
  const [mode, setMode] = useState<'member' | 'forgot' | 'admin'>('member');
  const [memberCode, setMemberCode] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        setError(data.error || 'Invalid credentials');
      } else {
        window.location.href = '/today';
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid admin credentials');
      } else {
        window.location.href = '/admin';
      }
    } catch {
      setError('An error occurred during sign in.');
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
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: memberCode }),
      });
      const data = await res.json();
      setMessage(data.message || 'If an account exists, a reset code was sent to the registered email.');
      setStep('verify');
    } catch {
      setMessage('If an account exists, a reset code was sent to the registered email.');
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
      <div className="w-full max-w-sm bg-surface p-6 rounded-2xl border border-line shadow-sm">
        <h1 className="text-2xl font-semibold text-center mb-1">Celebro Kitchen</h1>
        <p className="text-xs text-ink-2 text-center mb-6">
          {mode === 'member' && 'Member Access'}
          {mode === 'forgot' && 'Reset PIN'}
          {mode === 'admin' && 'Staff & Admin Access'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/20 text-danger text-xs rounded-xl text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-ok/10 border border-ok/20 text-ok text-xs rounded-xl text-center">
            {message}
          </div>
        )}

        {/* Member Mode */}
        {mode === 'member' && (
          <form onSubmit={handleMemberLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">Member ID / Phone</label>
              <input
                type="text"
                required
                value={memberCode}
                onChange={(e) => setMemberCode(e.target.value)}
                className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent"
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
                className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="5-digit PIN"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-accent text-white font-medium text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
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

        {/* Forgot PIN Mode */}
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
                    className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="e.g. CK-0001"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-accent text-white font-medium text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
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
                    className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Enter code"
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
                    className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="New PIN"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-accent text-white font-medium text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
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

        {/* Admin Mode */}
        {mode === 'admin' && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">Admin / Staff Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="admin@celebrokitchen.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-accent text-white font-medium text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In as Staff / Admin'}
            </button>

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
                Back to Member Sign In
              </button>
            </div>
          </form>
        )}

        {/* Hidden discrete access trigger for Admin switch */}
        {mode === 'member' && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setMode('admin');
                setError('');
                setMessage('');
              }}
              className="text-[10px] text-ink-2/40 hover:text-ink-2 transition-colors"
            >
              Staff Portal
            </button>
          </div>
        )}
      </div>

      <footer className="mt-6 text-[11px] text-ink-2 text-center max-w-xs">
        <p>Data stored: name, ID, phone, email, subscriptions & meals. No photos collected.</p>
      </footer>
    </main>
  );
}
