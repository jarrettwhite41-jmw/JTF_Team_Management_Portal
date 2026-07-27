import React, { useState } from 'react';
import { authService } from '../services/authService';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await authService.signIn(email.trim(), password);
    if (!result.success) {
      setError(result.error || 'Unable to sign in.');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-md bg-white rounded-xl border shadow-card p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Team Portal Login</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in with your assigned team account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              title="Email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-300"
              required
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              title="Password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-300"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
