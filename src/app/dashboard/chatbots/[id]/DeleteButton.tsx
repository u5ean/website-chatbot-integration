'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteButton({ chatbotId }: { chatbotId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    const ok = window.confirm('Delete this chatbot? This cannot be undone.');
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/chatbots/${chatbotId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      router.push('/dashboard');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-sm font-medium text-red-700 hover:underline disabled:opacity-60"
    >
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  );
}

