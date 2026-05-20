import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export const size = {
  width: 64,
  height: 64,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '64px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0b0b0b, #4b5563)',
          borderRadius: '16px',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: -1,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          X
        </div>
      </div>
    ),
    { ...size }
  );
}

