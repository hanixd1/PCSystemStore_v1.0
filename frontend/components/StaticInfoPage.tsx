type StaticInfoPageProps = {
  title: string;
  description: string;
};

export default function StaticInfoPage({ title, description }: StaticInfoPageProps) {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-14">
      <section className="mx-auto max-w-4xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-cyan">
          PCSystemStore
        </p>
        <h1 className="mt-3 text-3xl font-extrabold text-gray-900 md:text-4xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-gray-700">{description}</p>
      </section>
    </main>
  );
}
