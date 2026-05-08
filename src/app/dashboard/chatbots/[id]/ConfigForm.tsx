'use client';

import { useMemo, useState } from 'react';

type ChatbotConfig = {
  id: string;
  name: string;
  website_url: string;
  tone: string | null;
  persona_name: string | null;
  language: string | null;
  avatar_url: string | null;
  colors: any;
  bubble_position: string | null;
  welcome_message: string | null;
  starter_questions: string[] | null;
  lead_capture_enabled: boolean | null;
  handoff_url: string | null;
  is_active: boolean | null;
};

export default function ConfigForm({ chatbot }: { chatbot: ChatbotConfig }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [recrawling, setRecrawling] = useState(false);
  const [recrawlInfo, setRecrawlInfo] = useState<string | null>(null);

  const initialPrimary = useMemo(() => {
    const p = chatbot.colors?.primary;
    return typeof p === 'string' && p ? p : '#000000';
  }, [chatbot.colors]);

  const [name, setName] = useState(chatbot.name);
  const [tone, setTone] = useState(chatbot.tone ?? 'professional');
  const [personaName, setPersonaName] = useState(chatbot.persona_name ?? 'AI Assistant');
  const [language, setLanguage] = useState(chatbot.language ?? 'en');
  const [welcome, setWelcome] = useState(chatbot.welcome_message ?? 'Hi! How can I help you today?');
  const [primaryColor, setPrimaryColor] = useState(initialPrimary);
  const [bubblePosition, setBubblePosition] = useState(chatbot.bubble_position ?? 'bottom-right');
  const [starterQuestions, setStarterQuestions] = useState((chatbot.starter_questions ?? []).join('\n'));
  const [leadCapture, setLeadCapture] = useState(Boolean(chatbot.lead_capture_enabled));
  const [handoffUrl, setHandoffUrl] = useState(chatbot.handoff_url ?? '');
  const [isActive, setIsActive] = useState(chatbot.is_active !== false);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/dashboard/chatbots/${chatbot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          tone,
          persona_name: personaName,
          language,
          welcome_message: welcome,
          colors: { primary: primaryColor, text: '#ffffff' },
          bubble_position: bubblePosition,
          starter_questions: starterQuestions
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 8),
          lead_capture_enabled: leadCapture,
          handoff_url: handoffUrl || null,
          is_active: isActive,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to save');
      setSaved(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const onRecrawl = async () => {
    setRecrawling(true);
    setError(null);
    setRecrawlInfo(null);
    try {
      const res = await fetch(`/api/dashboard/chatbots/${chatbot.id}/recrawl`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Re-crawl failed');
      setRecrawlInfo(`Re-crawled ${json.pages ?? 0} pages`);
    } catch (e: any) {
      setError(e?.message || 'Re-crawl failed');
    } finally {
      setRecrawling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold">Configuration</h2>
          <p className="text-gray-500">Update your chatbot behavior and styling.</p>
        </div>
        <div className="flex items-center gap-3">
          {recrawlInfo && <div className="text-sm text-gray-600">{recrawlInfo}</div>}
          {saved && <div className="text-sm text-green-600">Saved</div>}
          <button
            onClick={onRecrawl}
            disabled={recrawling}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100"
          >
            {recrawling ? 'Re-crawling...' : 'Re-crawl'}
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chatbot Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Persona Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              value={personaName}
              onChange={(e) => setPersonaName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="direct">Direct</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="en"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              rows={3}
              value={welcome}
              onChange={(e) => setWelcome(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-10 h-10 border-none rounded-lg overflow-hidden"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />
                <div className="text-sm text-gray-500">{primaryColor}</div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bubble Position</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white"
                value={bubblePosition}
                onChange={(e) => setBubblePosition(e.target.value)}
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Starter Questions (one per line)</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              rows={5}
              value={starterQuestions}
              onChange={(e) => setStarterQuestions(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-gray-700">Lead Capture</div>
              <div className="text-xs text-gray-500">Ask for name/email before chatting.</div>
            </div>
            <input
              type="checkbox"
              checked={leadCapture}
              onChange={(e) => setLeadCapture(e.target.checked)}
              className="h-5 w-5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Handoff URL</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              value={handoffUrl}
              onChange={(e) => setHandoffUrl(e.target.value)}
              placeholder="https://cal.com/your-team"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-gray-700">Active</div>
              <div className="text-xs text-gray-500">Turn off to pause the chatbot.</div>
            </div>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-5 w-5"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
