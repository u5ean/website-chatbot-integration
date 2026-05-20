'use client';

import { useEffect, useMemo, useState } from 'react';

type Message = { role: 'user' | 'bot'; text: string };

const examples = [
  'How much does your web design package cost?',
  'Do you support mobile responsive websites?',
  'Can I talk to a human?',
];

const responses: Record<string, string> = {
  'How much does your web design package cost?':
    'Our business website packages start from RM1500 depending on features. If you tell me what you need (pages, forms, ecommerce), I can recommend the best option.',
  'Do you support mobile responsive websites?':
    'Yes. Every chatbot widget is mobile-responsive, and your visitors get instant answers on desktop and mobile.',
  'Can I talk to a human?':
    'Absolutely. If you prefer, we can hand off to your team via WhatsApp, email, or a booking link.',
};

export function DemoChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'user', text: 'How does this work?' },
    { role: 'bot', text: 'Paste your website URL. The AI learns your services and answers questions instantly for visitors.' },
  ]);
  const [typing, setTyping] = useState(false);

  const canSend = useMemo(() => !typing, [typing]);

  async function send(text: string) {
    if (!canSend) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setTyping(true);

    const reply = responses[text] ?? 'Great question. Join the waitlist and we’ll help you set it up for your site.';
    await new Promise((r) => setTimeout(r, 650));
    setMessages((m) => [...m, { role: 'bot', text: reply }]);
    setTyping(false);
  }

  useEffect(() => {
    const el = document.getElementById('demo-chat-scroll');
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur shadow-xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div className="text-sm font-semibold text-gray-900">Live demo</div>
        </div>
        <div className="text-xs text-gray-500">Fake preview</div>
      </div>

      <div id="demo-chat-scroll" className="h-[320px] overflow-auto px-5 py-4 space-y-3">
        {messages.map((m, idx) => (
          <div key={idx} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={[
                'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                m.role === 'user'
                  ? 'bg-gray-900 text-white rounded-br-md'
                  : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md',
              ].join(' ')}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing ? (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-white text-gray-900 border border-gray-200 px-4 py-3 text-sm shadow-sm">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:240ms]" />
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="px-5 pb-5">
        <div className="grid gap-2 sm:grid-cols-3">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => send(ex)}
              disabled={!canSend}
              className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-left text-sm text-gray-700 shadow-sm hover:bg-gray-50 transition disabled:opacity-60"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

