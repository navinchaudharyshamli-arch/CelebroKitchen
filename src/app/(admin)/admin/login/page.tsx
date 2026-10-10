'use client';

import { useState } from 'react';

export default function AdminPortalPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <main className="min-h-screen flex flex-col justify-center items-center p-4 bg-bg text-ink">
      <div className="w-full max-w-sm bg-surface p-6 rounded-2xl border border-line shadow-sm space-y-4">
        <h1 className="text-2xl font-semibold text-center mb-1 tracking-tight">Celebro Kitchen</h1>
        <p className="text-xs text-ink-2 text-center mb-4">Staff & Admin Management Portal</p>

        {error && (
          <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1">Staff Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 bg-surface-2 border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent text-sm"
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
              className="w-full h-12 px-4 bg-surface-2 border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              placeholder="Enter password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-accent text-white font-medium text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In as Admin'}
          </button>
        </form>
      </div>
    </main>
  );
}
