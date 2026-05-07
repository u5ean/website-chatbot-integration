import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <main className="max-w-4xl text-center space-y-8">
        <h1 className="text-6xl font-extrabold tracking-tight text-gray-900 sm:text-7xl">
          Turn your website into an <span className="text-black underline decoration-wavy decoration-1 underline-offset-8">AI powerhouse</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Add an intelligent chatbot to your site in minutes. Crawl your content, train your AI, and start engaging visitors instantly.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="bg-black text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-800 transition-all"
          >
            Get Started for Free
          </Link>
          <Link
            href="#features"
            className="text-gray-600 font-semibold hover:text-black transition-colors"
          >
            View Demo
          </Link>
        </div>
      </main>
    </div>
  );
}
