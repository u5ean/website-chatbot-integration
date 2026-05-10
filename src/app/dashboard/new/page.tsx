'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Globe, Check, Settings2 } from 'lucide-react';

export default function NewChatbotPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: URL, 2: Review, 3: Configure
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [extractedInfo, setExtractedInfo] = useState<any>(null);
  const [config, setConfig] = useState({
    tone: 'professional',
    persona_name: 'AI Assistant',
    welcome_message: 'Hi! How can I help you today?',
    primary_color: '#000000',
  });

  const handleCrawl = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setExtractedInfo(data.businessInfo);
      setStep(2);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl: url,
          name: extractedInfo.name || 'My Chatbot',
          config: {
            tone: config.tone,
            persona_name: config.persona_name,
            welcome_message: config.welcome_message,
            colors: { primary: config.primary_color, text: '#ffffff' },
          }
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      router.push(`/dashboard/chatbots/${data.chatbotId}/embed`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-12">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= s ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'}`}>
              {step > s ? <Check size={20} /> : s}
            </div>
            {s < 3 && <div className={`w-24 h-1 ${step > s ? 'bg-black' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="text-gray-400" />
            <h2 className="text-xl font-bold">Start with your website</h2>
          </div>
          <p className="text-gray-500 mb-6">Enter your website URL and we'll crawl it to learn about your business.</p>
          <input
            type="url"
            placeholder="https://example.com"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-black"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            onClick={handleCrawl}
            disabled={loading || !url}
            className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" size={20} />}
            {loading ? (
              <span className="text-center leading-tight">
                Crawling Website...
                <br />
                <span className="text-xs font-normal opacity-80">Takes up to 2 minutes</span>
              </span>
            ) : (
              'Analyze Website'
            )}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Check className="text-green-500" />
            <h2 className="text-xl font-bold">Review Extracted Info</h2>
          </div>
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                value={extractedInfo?.name}
                onChange={(e) => setExtractedInfo({ ...extractedInfo, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                value={extractedInfo?.type}
                onChange={(e) => setExtractedInfo({ ...extractedInfo, type: e.target.value })}
              />
            </div>
          </div>
          <button
            onClick={() => setStep(3)}
            className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800"
          >
            Looks good, next
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Settings2 className="text-gray-400" />
            <h2 className="text-xl font-bold">Configure Chatbot</h2>
          </div>
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Persona Name</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                value={config.persona_name}
                onChange={(e) => setConfig({ ...config, persona_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                rows={3}
                value={config.welcome_message}
                onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-10 h-10 border-none rounded-lg overflow-hidden"
                  value={config.primary_color}
                  onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                />
                <span className="text-sm text-gray-500">{config.primary_color}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleFinalize}
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" size={20} />}
            {loading ? (
              <span className="text-center leading-tight">
                Creating Chatbot...
                <br />
                <span className="text-xs font-normal opacity-80">Takes up to 2-5 minutes</span>
              </span>
            ) : (
              'Launch Chatbot'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
