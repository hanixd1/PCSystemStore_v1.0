import { serializeJsonLd } from '@/lib/json-ld';

export default function StructuredData({ nonce, value }: { nonce: string; value: unknown }) {
  return (
    <script
      nonce={nonce}
      suppressHydrationWarning
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(value) }}
    />
  );
}
