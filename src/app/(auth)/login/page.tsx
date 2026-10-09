'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [memberCode, setMemberCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
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
        if (data.mustChangePin) {
          window.location.href = '/me?change_pin=true';
        } else {
          window.location.href = '/today';
        }
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-center items-center p-4 bg-bg text-ink">
      <div className="w-full max-w-sm bg-surface p-6 rounded-2xl border border-line shadow-sm">
        <h1 className="text-2xl font-semibold text-center mb-6">Celebro Kitchen</h1>
        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl text-center">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Member ID / Phone</label>
            <input
              type="text"
              required
              value={memberCode}
              onChange={(e) => setMemberCode(e.target.value)}
              className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g. CK-0042"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">PIN</label>
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
            className="w-full py-3 bg-accent text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <a href="/forgot" className="text-sm text-accent hover:underline">
            Forgot PIN?
          </a>
        </div>
      </div>
      <footer className="mt-8 text-xs text-ink-2 text-center max-w-xs">
        <p>Data stored: name, ID, phone, email, subscriptions & meals. No photos collected.</p>
      </footer>
    </main>
  );
}
