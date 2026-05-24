const MAP_UNAVAILABLE_MESSAGE = 'Mapa temporalmente no disponible.';

export default function StoreLocationMap() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const query = process.env.NEXT_PUBLIC_STORE_MAP_QUERY?.trim();
  const address = process.env.NEXT_PUBLIC_STORE_ADDRESS?.trim();
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (!apiKey || !query) {
    return (
      <div className="mb-12 overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50 shadow-sm">
        <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center md:min-h-[450px]">
          <p className="text-lg font-bold text-gray-700">{MAP_UNAVAILABLE_MESSAGE}</p>
          {isDevelopment ? (
            <p className="mt-2 max-w-md text-sm text-gray-500">
              Configura NEXT_PUBLIC_GOOGLE_MAPS_API_KEY y NEXT_PUBLIC_STORE_MAP_QUERY.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const encodedQuery = encodeURIComponent(query);
  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedQuery}`;
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  return (
    <section className="mb-12 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
      <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-cyan">Ubicación</p>
          <p className="mt-1 text-base font-semibold text-gray-900">
            {address || 'PCSystemStore, Huancayo, Perú'}
          </p>
        </div>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center justify-center rounded-full bg-gray-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-cyan hover:text-gray-900"
        >
          Cómo llegar
        </a>
      </div>

      <iframe
        title="Ubicación de PCSystemStore"
        src={embedUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="h-[320px] w-full border-0 md:h-[450px]"
      />
    </section>
  );
}
