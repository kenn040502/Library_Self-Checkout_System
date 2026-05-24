const COVER_GRADIENTS = [
  'linear-gradient(135deg, #C9A961 0%, #8B6F3A 100%)',
  'linear-gradient(135deg, #1F2128 0%, #3A3D4A 100%)',
  'linear-gradient(135deg, #7B1D2B 0%, #C82333 100%)',
  'linear-gradient(135deg, #E4CE95 0%, #C9A961 100%)',
  'linear-gradient(135deg, #2A3244 0%, #1F2128 100%)',
  'linear-gradient(135deg, #A88D5A 0%, #6B5A38 100%)',
  'linear-gradient(135deg, #1A3A4F 0%, #0D1F2C 100%)',
  'linear-gradient(135deg, #3A4A2F 0%, #1F2818 100%)',
  'linear-gradient(135deg, #4A2F3A 0%, #2B1A22 100%)',
  'linear-gradient(135deg, #2F3A4A 0%, #1A2330 100%)',
];

export function getBookGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length];
}

type BookCoverProps = {
  gradient: string;
  title?: string;
  author?: string;
  w?: number;
  h?: number;
  radius?: number;
  /** Fill parent positioned container (position: absolute; inset: 0) instead of fixed px size */
  fill?: boolean;
};

export default function BookCover({ gradient, title, author, w = 48, h = 68, radius = 4, fill = false }: BookCoverProps) {
  return (
    <div
      style={{
        ...(fill
          ? { position: 'absolute', inset: 0 }
          : { position: 'relative', width: w, height: h, flexShrink: 0 }),
        borderRadius: radius,
        background: gradient,
        overflow: 'hidden',
      }}
    >
      {/* Stripe overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 6px)',
      }} />
      {/* Spine shadow */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'rgba(0,0,0,0.2)' }} />
      {/* Gold foil lines */}
      <div style={{ position: 'absolute', left: 6, right: 4, top: '38%', height: 1, background: 'rgba(201,169,97,0.7)' }} />
      <div style={{ position: 'absolute', left: 6, right: 4, top: '62%', height: 1, background: 'rgba(201,169,97,0.5)' }} />
      {title && (fill || w > 80) && (
        <div style={{
          position: 'absolute', inset: 0, padding: '10px 8px 10px 10px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          color: 'rgba(255,255,255,0.95)', fontFamily: 'var(--font-newsreader), Georgia, serif',
        }}>
          <div style={{ fontSize: fill ? 11 : (w > 120 ? 11 : 9), fontWeight: 600, lineHeight: 1.15, letterSpacing: 0.2, textTransform: 'uppercase' }}>
            {title.length > 24 ? title.slice(0, 22) + '…' : title}
          </div>
          <div style={{ fontSize: fill ? 9 : (w > 120 ? 9 : 7.5), opacity: 0.8, fontStyle: 'italic', fontFamily: 'var(--font-newsreader), Georgia, serif' }}>
            {author}
          </div>
        </div>
      )}
    </div>
  );
}
