'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/landing/ToastProvider';

type WaitlistPayload = {
  name: string;
  email: string;
  website?: string;
};

export function WaitlistForm({
  compact = false,
  source,
}: {
  compact?: boolean;
  source: 'hero' | 'section' | 'final';
}) {
  const { push } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const disabled = status === 'loading' || status === 'success';

  const isValidEmail = useMemo(() => {
    const e = email.trim();
    if (!e) return false;
    if (e.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }, [email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;

    const n = name.trim();
    const em = email.trim();
    const w = website.trim();

    if (!n) {
      push({ variant: 'error', title: 'Name required', description: 'Please enter your name.' });
      return;
    }
    if (!isValidEmail) {
      push({ variant: 'error', title: 'Invalid email', description: 'Please enter a valid email address.' });
      return;
    }

    setStatus('loading');
    try {
      const payload: WaitlistPayload = { name: n, email: em, website: w || undefined };
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatus('success');
        push({
          variant: 'success',
          title: 'You’re on the waitlist',
          description: 'We’ll email you when early access opens.',
        });
        return;
      }

      const json = (await res.json().catch(() => ({}))) as any;
      const msg = typeof json?.error === 'string' ? json.error : 'Something went wrong';

      if (res.status === 409) {
        setStatus('success');
        push({ variant: 'info', title: 'Already on the waitlist', description: 'This email is already registered.' });
        return;
      }

      if (res.status === 429) {
        push({ variant: 'error', title: 'Too many attempts', description: 'Please try again in a bit.' });
        setStatus('idle');
        return;
      }

      push({ variant: 'error', title: 'Couldn’t join waitlist', description: msg });
      setStatus('idle');
    } catch (err: any) {
      push({
        variant: 'error',
        title: 'Network error',
        description: err?.message ? String(err.message) : 'Please try again.',
      });
      setStatus('idle');
    }
  }

  return (
    <form onSubmit={onSubmit} className={compact ? 'w-full' : 'w-full'}>
      <input type="hidden" name="source" value={source} />
      <div className={compact ? 'grid gap-3 sm:grid-cols-3' : 'grid gap-3 sm:grid-cols-3'}>
        <div className="sm:col-span-1">
          <label className="sr-only" htmlFor={`wl-name-${source}`}>
            Name
          </label>
          <input
            id={`wl-name-${source}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
            placeholder="Name"
            autoComplete="name"
            className="w-full rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="sr-only" htmlFor={`wl-email-${source}`}>
            Email
          </label>
          <input
            id={`wl-email-${source}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={disabled}
            placeholder="Email"
            autoComplete="email"
            inputMode="email"
            className="w-full rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="sr-only" htmlFor={`wl-website-${source}`}>
            Company / Website (optional)
          </label>
          <input
            id={`wl-website-${source}`}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            disabled={disabled}
            placeholder="Company / Website (optional)"
            autoComplete="url"
            className="w-full rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          />
        </div>
      </div>

      <div className={compact ? 'mt-3 flex items-center justify-between gap-3' : 'mt-4 flex items-center justify-between gap-3'}>
        <div className="text-xs text-gray-500">
          No spam. Early access invites only.
        </div>
        <button
          type="submit"
          disabled={disabled}
          className={[
            'inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition',
            disabled ? 'opacity-60' : 'hover:bg-black',
          ].join(' ')}
        >
          {status === 'loading' ? 'Joining…' : status === 'success' ? 'Joined' : 'Join waitlist'}
        </button>
      </div>
    </form>
  );
}

