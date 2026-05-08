'use client';

import { useState } from 'react';

export default function TagsEditor({
  chatbotId,
  sessionId,
  initialTags,
}: {
  chatbotId: string;
  sessionId: string;
  initialTags: string[];
}) {
  const [value, setValue] = useState(initialTags.join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const tags = value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12);

      const res = await fetch(`/api/dashboard/chatbots/${chatbotId}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_tags: tags }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to save tags');
      setSaved(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to save tags');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">Lead tags</div>
      <div className="flex items-center gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="hot, enterprise, pricing"
        />
        <button
          onClick={save}
          disabled={saving}
          className="px-3 py-2 rounded-lg text-sm font-semibold bg-black text-white hover:bg-gray-800 disabled:bg-gray-400"
        >
          {saving ? 'Saving' : 'Save'}
        </button>
      </div>
      {saved && <div className="text-xs text-green-600">Saved</div>}
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}

