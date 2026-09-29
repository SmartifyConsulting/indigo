/** Ten cursive Google Fonts used to render e-signatures. Loaded via the link tag in `__root.tsx`. */
export const SIGNATURE_FONTS = [
  "Dancing Script",
  "Great Vibes",
  "Sacramento",
  "Alex Brush",
  "Pacifico",
  "Satisfy",
  "Allura",
  "Parisienne",
  "Yellowtail",
  "Caveat",
] as const;

export type SignatureFont = (typeof SIGNATURE_FONTS)[number];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}

/**
 * Picks a font for a new signature. Seeded so repeated signings by the same person still
 * rotate (the seed includes the signature id), but never lands on `avoid` — so a client's
 * signature never renders in the same font as the wealth manager's on the same document.
 */
export function pickSignatureFont(seed: string, avoid?: SignatureFont): SignatureFont {
  let idx = Math.abs(hash(seed)) % SIGNATURE_FONTS.length;
  if (avoid && SIGNATURE_FONTS[idx] === avoid) idx = (idx + 1) % SIGNATURE_FONTS.length;
  return SIGNATURE_FONTS[idx]!;
}

/**
 * The wealth manager's signature font for one client. Seeded by advisor + case so it is the same
 * on every document for that client (it may differ on another client's documents), and never
 * uses a font the client's own signatures use on that case.
 */
export function advisorSignatureFont(
  advisorId: string,
  caseId: string,
  clientFonts: (SignatureFont | undefined)[],
): SignatureFont {
  const avoid = new Set(clientFonts.filter(Boolean));
  const start = Math.abs(hash(`wm:${advisorId}:${caseId}`)) % SIGNATURE_FONTS.length;
  for (let i = 0; i < SIGNATURE_FONTS.length; i++) {
    const f = SIGNATURE_FONTS[(start + i) % SIGNATURE_FONTS.length]!;
    if (!avoid.has(f)) return f;
  }
  return SIGNATURE_FONTS[start]!;
}

/** A synthetic IP for the demo audit trail; not a real network address. */
export function syntheticIp(seed: string): string {
  const h = Math.abs(hash(seed));
  const octet = (n: number) => 1 + ((h >> (n * 8)) & 0xff) % 254;
  return `${octet(0)}.${octet(1)}.${octet(2)}.${octet(3)}`;
}
