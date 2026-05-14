import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-48 bg-white border-r border-gray-200">
        <div className="p-6">
          <Link href="/dashboard" className="text-xl font-bold">
            ChatSaaS AI
          </Link>
        </div>
        <nav className="px-4 space-y-2">
          <Link href="/dashboard" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
            Chatbots
          </Link>
          <Link href="/dashboard/billing" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
            Billing
          </Link>
          <Link href="/dashboard/settings" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
            Account
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <form action="/auth/signout" method="post">
              <button className="text-sm text-red-600 hover:underline">Sign out</button>
            </form>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
