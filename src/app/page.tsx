import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing/LandingPage';

function isWaitlistModeEnabled() {
  const v = process.env.WAITLIST_MODE;
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

function parseAdminEmails() {
  const raw = process.env.WAITLIST_ADMIN_EMAILS;
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    if (!isWaitlistModeEnabled()) {
      redirect('/dashboard');
    }
    const email = user.email?.toLowerCase() ?? '';
    if (email && parseAdminEmails().includes(email)) {
      redirect('/dashboard');
    }
  }

  return <LandingPage />;
}
