import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: 'white',
          padding: '72px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 20% 20%, rgba(16,185,129,0.12), transparent 35%), radial-gradient(circle at 80% 30%, rgba(59,130,246,0.12), transparent 40%), radial-gradient(circle at 60% 80%, rgba(168,85,247,0.10), transparent 45%)',
          }}
        />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #0b0b0b, #4b5563)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: -1,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            X
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#111827',
              letterSpacing: -0.6,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            XEPLY AI
          </div>
        </div>

        <div style={{ position: 'relative', marginTop: 36 }}>
          <div
            style={{
              fontSize: 66,
              fontWeight: 700,
              color: '#111827',
              lineHeight: 1.05,
              letterSpacing: -2,
              fontFamily: 'Inter, system-ui, sans-serif',
              maxWidth: 920,
            }}
          >
            Turn Your Website Into an AI Sales Assistant
          </div>
          <div
            style={{
              marginTop: 22,
              fontSize: 28,
              color: '#4b5563',
              lineHeight: 1.35,
              fontFamily: 'Inter, system-ui, sans-serif',
              maxWidth: 920,
            }}
          >
            Paste your URL, embed in minutes, and convert visitors 24/7.
          </div>
        </div>

        <div style={{ position: 'relative', marginTop: 44, display: 'flex', gap: 14 }}>
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 999,
              background: '#111827',
              color: 'white',
              fontSize: 18,
              fontWeight: 600,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            Join waitlist
          </div>
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 999,
              background: 'rgba(17,24,39,0.06)',
              color: '#111827',
              fontSize: 18,
              fontWeight: 600,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            Early access
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

