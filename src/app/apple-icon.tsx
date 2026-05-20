import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '180px',
          height: '180px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0b0b0b, #4b5563)',
          borderRadius: '44px',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 88,
            fontWeight: 700,
            letterSpacing: -2,
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

