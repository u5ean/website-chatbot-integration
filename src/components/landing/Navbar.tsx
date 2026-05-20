'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div
        className={[
          'border-b transition-all',
          scrolled ? 'bg-white/80 backdrop-blur border-gray-200 shadow-sm' : 'bg-transparent border-transparent',
        ].join(' ')}
      >
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-gray-900 to-gray-600 shadow-sm" />
            <div className="font-semibold tracking-tight text-gray-900">XEPLY AI</div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <button type="button" className="hover:text-gray-900" onClick={() => scrollToId('features')}>
              Features
            </button>
            <button type="button" className="hover:text-gray-900" onClick={() => scrollToId('how')}>
              How it works
            </button>
            <button type="button" className="hover:text-gray-900" onClick={() => scrollToId('demo')}>
              Demo
            </button>
            <button type="button" className="hover:text-gray-900" onClick={() => scrollToId('faq')}>
              FAQ
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-full px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition"
            >
              Log in
            </Link>
            <button
              type="button"
              onClick={() => scrollToId('waitlist')}
              className="inline-flex items-center justify-center rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black transition"
            >
              Join waitlist
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

