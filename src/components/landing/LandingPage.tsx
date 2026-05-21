import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Reveal } from '@/components/landing/Reveal';
import { ToastProvider } from '@/components/landing/ToastProvider';
import { WaitlistForm } from '@/components/landing/WaitlistForm';
import { DemoChat } from '@/components/landing/DemoChat';

function FeatureIcon({ name }: { name: string }) {
  const common = 'h-5 w-5';
  if (name === 'learn') {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l9 5-9 5-9-5 9-5Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 10l9 5 9-5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 14l9 5 9-5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (name === 'embed') {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 8l-4 4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M16 8l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M10 18l4-12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === 'leads') {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20 21v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === 'globe') {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 12h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 3c3 3 3 15 0 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 3c-3 3-3 15 0 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === 'handoff') {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20 8a6 6 0 0 1-6 6H9l-5 5v-5a6 6 0 0 1 6-6h4a6 6 0 0 0 6-6Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2v20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M2 12h20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChatbotMockup() {
  return (
    <div className="relative w-full max-w-[480px]">
      <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-gray-900/10 via-gray-900/0 to-gray-900/10 blur-2xl" />
      <div className="relative rounded-[32px] border border-gray-200 bg-white/80 backdrop-blur shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <div className="text-sm font-semibold text-gray-900">AI Sales Assistant</div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-gray-300" />
            <div className="h-2 w-2 rounded-full bg-gray-300" />
            <div className="h-2 w-2 rounded-full bg-gray-300" />
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm">
              Hi! I can answer questions about your services, pricing, and availability.
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gray-900 px-4 py-3 text-sm text-white shadow-sm">
              Do you offer monthly retainers?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm">
              Yes. We can do monthly retainers for updates, SEO, and ongoing improvements. Want me to collect your email so the team can reach out?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:240ms]" />
              </span>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
            <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
            <div className="h-2.5 flex-1 rounded-full bg-gray-200" />
            <div className="h-9 w-9 rounded-xl bg-gray-900 text-white grid place-items-center text-sm font-semibold">
              ↵
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="max-w-2xl">
      <div className="text-xs font-semibold tracking-widest text-gray-500 uppercase">{eyebrow}</div>
      <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">{title}</h2>
      <p className="mt-3 text-base text-gray-600">{subtitle}</p>
    </div>
  );
}

export function LandingPage() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-20 left-1/2 h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-gradient-to-r from-gray-900/10 via-gray-900/0 to-gray-900/10 blur-3xl" />
          <div className="absolute top-[55vh] left-[-160px] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-emerald-300/10 to-sky-300/10 blur-3xl" />
          <div className="absolute top-[40vh] right-[-180px] h-[460px] w-[460px] rounded-full bg-gradient-to-br from-purple-300/10 to-pink-300/10 blur-3xl" />
        </div>

        <Navbar />

        <main>
          <section className="mx-auto max-w-6xl px-4 pt-14 pb-12 sm:pt-20 sm:pb-20">
            <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className="max-w-[560px] lg:pr-6 lg:row-span-2">
                <Reveal>
                  <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-xs text-gray-700 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Launching soon • Early access waitlist open
                  </div>
                </Reveal>
                <Reveal delayMs={80}>
                  <h1 className="mt-5 text-4xl sm:text-6xl font-semibold tracking-tight text-gray-900">
                    Turn Your Website Into an AI Sales Assistant
                  </h1>
                </Reveal>
                <Reveal delayMs={140}>
                  <p className="mt-5 text-lg text-gray-600 max-w-xl">
                    Paste your URL, let the AI learn your business, and embed a high-converting chatbot in minutes. Capture leads, answer FAQs, and hand off to humans when it matters.
                  </p>
                </Reveal>

                <Reveal delayMs={260}>
                  <div className="mt-6 grid grid-cols-3 gap-3 max-w-xl">
                    <div className="rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm">
                      <div className="text-xs text-gray-500">Setup</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">5 minutes</div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm">
                      <div className="text-xs text-gray-500">Embed</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">1 line</div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm">
                      <div className="text-xs text-gray-500">Coverage</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">24/7</div>
                    </div>
                  </div>
                </Reveal>

                <Reveal delayMs={320}>
                  <div className="mt-7 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3 py-1 shadow-sm">
                      <span className="h-5 w-5 rounded-full bg-gray-900 text-white grid place-items-center text-[10px] font-semibold">
                        S
                      </span>
                      Inspired by Stripe-level UX
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3 py-1 shadow-sm">
                      <span className="h-5 w-5 rounded-full bg-gray-900 text-white grid place-items-center text-[10px] font-semibold">
                        O
                      </span>
                      OpenAI-powered answers
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3 py-1 shadow-sm">
                      <span className="h-5 w-5 rounded-full bg-gray-900 text-white grid place-items-center text-[10px] font-semibold">
                        V
                      </span>
                      Vercel-grade performance
                    </div>
                  </div>
                </Reveal>
              </div>

              <Reveal delayMs={200} className="lg:col-start-2 lg:row-start-2 lg:justify-self-end w-full max-w-[480px]">
                <div id="waitlist" className="rounded-3xl border border-gray-200 bg-white/70 backdrop-blur shadow-xl p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Join the waitlist</div>
                      <div className="mt-1 text-xs text-gray-500">Get early access + launch pricing.</div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        No credit card
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-900" />
                        Cancel anytime
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <WaitlistForm source="hero" compact />
                  </div>
                </div>
              </Reveal>

              <Reveal
                delayMs={120}
                className="lg:col-start-2 lg:row-start-1 lg:justify-self-end lg:mt-6 xl:mt-8 lg:scale-[1.06] xl:scale-[1.1] origin-top-right"
              >
                <ChatbotMockup />
              </Reveal>
            </div>
          </section>

          <section id="features" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <div className="flex flex-col gap-10">
              <Reveal>
                <SectionHeading
                  eyebrow="Features"
                  title="A chatbot that sells — without feeling robotic"
                  subtitle="Premium UX, clean embed, and the right automation: instant answers, lead capture, and handoff when needed."
                />
              </Reveal>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: 'learn', title: 'AI learns from your website', desc: 'Crawl your pages and turn them into instant answers.' },
                  { icon: 'embed', title: 'One-click embed', desc: 'Copy a single script tag to go live on any site.' },
                  { icon: 'leads', title: 'Lead capture', desc: 'Collect name/email at the perfect moment, not too early.' },
                  { icon: 'globe', title: 'Multi-language support', desc: 'Serve your customers in their preferred language.' },
                  { icon: 'learn', title: 'AI sales assistant', desc: 'Guide prospects to the right package and next step.' },
                  { icon: 'embed', title: 'Mobile responsive widget', desc: 'Designed for touch, fast load, and clean spacing.' },
                  { icon: 'handoff', title: 'Human handoff support', desc: 'Pass qualified leads to WhatsApp, email, or booking.' },
                  { icon: 'leads', title: 'Instant answers for visitors', desc: 'Reduce bounce and increase conversions 24/7.' },
                ].map((f, idx) => (
                  <Reveal key={f.title} delayMs={idx * 60}>
                    <div className="group rounded-3xl border border-gray-200 bg-white/70 backdrop-blur p-5 shadow-sm hover:shadow-lg transition">
                      <div className="h-10 w-10 rounded-2xl bg-gray-900 text-white grid place-items-center shadow-sm group-hover:scale-[1.02] transition">
                        <FeatureIcon name={f.icon} />
                      </div>
                      <div className="mt-4 text-sm font-semibold text-gray-900">{f.title}</div>
                      <div className="mt-2 text-sm text-gray-600">{f.desc}</div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          <section id="how" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
              <Reveal>
                <SectionHeading
                  eyebrow="How it works"
                  title="From URL to AI assistant in 3 steps"
                  subtitle="No complicated setup. The system learns your business from your existing website, then generates a production-ready widget."
                />
              </Reveal>

              <div className="relative">
                <div className="absolute left-6 top-6 bottom-6 w-px bg-gradient-to-b from-gray-900/20 via-gray-900/5 to-gray-900/20 hidden sm:block" />
                <div className="grid gap-4">
                  {[
                    {
                      step: '01',
                      title: 'Paste website URL',
                      desc: 'Enter your homepage or docs URL to begin.',
                    },
                    {
                      step: '02',
                      title: 'AI crawls and learns your business',
                      desc: 'We extract your services, pricing, FAQs, and key pages.',
                    },
                    {
                      step: '03',
                      title: 'Copy embed code into your website',
                      desc: 'Deploy instantly with a single script tag.',
                    },
                  ].map((s, idx) => (
                    <Reveal key={s.step} delayMs={idx * 100}>
                      <div className="relative rounded-3xl border border-gray-200 bg-white/70 backdrop-blur p-6 shadow-sm hover:shadow-lg transition">
                        <div className="flex items-start gap-4">
                          <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-900 text-white font-semibold shadow-sm">
                            {s.step}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900">{s.title}</div>
                            <div className="mt-2 text-sm text-gray-600">{s.desc}</div>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="demo" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
              <Reveal>
                <SectionHeading
                  eyebrow="Demo"
                  title="Try a sample conversation"
                  subtitle="This is a fake preview with realistic behavior: suggested prompts, typing animation, and helpful answers."
                />
                <div className="mt-8 rounded-3xl border border-gray-200 bg-white/70 backdrop-blur shadow-xl p-6">
                  <div className="text-sm font-semibold text-gray-900">Want early access?</div>
                  <div className="mt-1 text-sm text-gray-600">Join the waitlist and we’ll invite you first.</div>
                  <div className="mt-4">
                    <WaitlistForm source="section" compact />
                  </div>
                </div>
              </Reveal>
              <Reveal delayMs={120}>
                <DemoChat />
              </Reveal>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <Reveal>
              <SectionHeading
                eyebrow="Social proof"
                title="Designed for modern, conversion-focused teams"
                subtitle="Placeholder testimonials for now. Replace these with real customer stories after your first few installs."
              />
            </Reveal>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                { name: 'Founder, Agency', quote: 'Setup was effortless. Visitors get answers instantly and we capture better leads.' },
                { name: 'Marketing Lead', quote: 'The widget looks premium and doesn’t clash with our site design.' },
                { name: 'Product Team', quote: 'We reduced support load while improving conversion from pricing pages.' },
              ].map((t, idx) => (
                <Reveal key={t.name} delayMs={idx * 100}>
                  <div className="rounded-3xl border border-gray-200 bg-white/70 backdrop-blur p-6 shadow-sm hover:shadow-lg transition">
                    <div className="text-sm text-gray-700">{t.quote}</div>
                    <div className="mt-4 text-sm font-semibold text-gray-900">{t.name}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          <section id="faq" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <Reveal>
              <SectionHeading
                eyebrow="FAQ"
                title="Answers to common questions"
                subtitle="Everything you need to know before launching an AI assistant on your site."
              />
            </Reveal>
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {[
                {
                  q: 'How does the AI learn my website?',
                  a: 'We crawl your pages, extract the important parts, and build a knowledge base. When visitors ask a question, the AI answers using your content and sources.',
                },
                {
                  q: 'Do I need coding knowledge?',
                  a: 'No. You paste your website URL, configure the tone, then copy a single script tag into your site.',
                },
                {
                  q: 'Does it support mobile?',
                  a: 'Yes. The widget is responsive and optimized for touch interactions.',
                },
                {
                  q: 'Can I customize the chatbot?',
                  a: 'Yes. Customize tone, welcome message, colors, and bubble position. More design controls will be available after launch.',
                },
                {
                  q: 'Is it multilingual?',
                  a: 'Yes. The assistant can answer in multiple languages depending on your visitors.',
                },
                {
                  q: 'Will there be a free plan?',
                  a: 'Yes. A limited free tier will be available, with paid plans unlocking higher usage and more chatbots.',
                },
              ].map((f, idx) => (
                <Reveal key={f.q} delayMs={idx * 60}>
                  <details className="group rounded-3xl border border-gray-200 bg-white/70 backdrop-blur p-6 shadow-sm open:shadow-lg transition">
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                      <div className="text-sm font-semibold text-gray-900">{f.q}</div>
                      <div className="h-9 w-9 rounded-2xl border border-gray-200 bg-white text-gray-700 grid place-items-center group-open:rotate-45 transition">
                        +
                      </div>
                    </summary>
                    <div className="mt-3 text-sm text-gray-600">{f.a}</div>
                  </details>
                </Reveal>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
            <Reveal>
              <div className="rounded-[40px] border border-gray-200 bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-2xl overflow-hidden">
                <div className="px-6 py-12 sm:px-12 sm:py-14 grid gap-10 lg:grid-cols-2 lg:items-center">
                  <div>
                    <div className="text-xs font-semibold tracking-widest text-white/70 uppercase">Final CTA</div>
                    <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
                      Be First To Launch AI On Your Website
                    </h2>
                    <p className="mt-3 text-white/75">
                      Join the waitlist to get early access, onboarding help, and launch pricing.
                    </p>
                  </div>
                  <div className="rounded-3xl bg-white/10 border border-white/10 p-5">
                    <WaitlistForm source="final" compact />
                    <div className="mt-4 flex items-center justify-between text-xs text-white/70">
                      <div>Early access invites roll out weekly.</div>
                      <Link href="/login" className="underline decoration-white/30 hover:decoration-white/70">
                        Already have an account?
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </section>
        </main>

        <footer className="border-t border-gray-200 bg-white/70 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-gray-900 to-gray-600 shadow-sm" />
              <div>
                <div className="text-sm font-semibold text-gray-900">XEPLY AI</div>
                <div className="text-xs text-gray-500">Turn your website into an AI sales assistant.</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <a className="hover:text-gray-900" href="mailto:hello@xeplyai.com">
                hello@xeplyai.com
              </a>
              <a className="hover:text-gray-900" href="https://x.com" target="_blank" rel="noreferrer">
                X
              </a>
              <a className="hover:text-gray-900" href="https://linkedin.com" target="_blank" rel="noreferrer">
                LinkedIn
              </a>
              <a className="hover:text-gray-900" href="https://github.com" target="_blank" rel="noreferrer">
                GitHub
              </a>
            </div>

            <div className="text-xs text-gray-500">
              © {new Date().getFullYear()} XEPLY AI. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}

