const CONTACT_CHANNELS = [
  {
    label: 'WhatsApp',
    value: '+51 959139676',
    href: 'https://wa.me/51959139676',
  },
  {
    label: 'Correo electrónico',
    value: 'admin@pcsystemstore.com.pe',
    href: 'mailto:admin@pcsystemstore.com.pe',
  },
  {
    label: 'Tienda física',
    value: 'Av. Giráldez 274, Centro de Huancayo, Perú',
    href: '/tienda',
  },
];

export default function ContactarPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <article className="mx-auto max-w-5xl">
        <header className="border-b border-cyan-400/40 pb-6">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-500">
            PCSystemStore
          </p>
          <h1 className="mt-3 text-4xl font-extrabold text-gray-950">Escríbenos</h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-gray-700">
            Para consultas relacionadas con atención comercial, pedidos, soporte o información de
            productos, puedes comunicarte con PCSystemStore mediante nuestros canales oficiales.
          </p>
        </header>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {CONTACT_CHANNELS.map((channel) => (
            <a
              key={channel.label}
              href={channel.href}
              className="border border-gray-300 bg-transparent p-6 transition-colors hover:border-cyan-400"
              target={channel.href.startsWith('http') ? '_blank' : undefined}
              rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              <h2 className="text-lg font-extrabold text-gray-950">{channel.label}</h2>
              <p className="mt-3 text-base leading-7 text-gray-700">{channel.value}</p>
            </a>
          ))}
        </section>
      </article>
    </main>
  );
}
