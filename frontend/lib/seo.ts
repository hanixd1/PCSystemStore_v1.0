import type { Metadata } from 'next';
import { absoluteUrl, getSiteUrl } from '@/lib/site-url';

export const CATEGORY_SEO: Record<string, { name: string; description: string }> = {
  componentes: { name: 'Componentes para PC', description: 'Procesadores, placas base, memoria, tarjetas gráficas, almacenamiento y otros componentes para PC.' },
  cpu: { name: 'Procesadores', description: 'Procesadores para computadoras de escritorio y equipos de alto rendimiento.' },
  'cpu/amd': { name: 'Procesadores AMD', description: 'Procesadores AMD disponibles en el catálogo de PCSystemStore.' },
  'cpu/intel': { name: 'Procesadores Intel', description: 'Procesadores Intel disponibles en el catálogo de PCSystemStore.' },
  mobo: { name: 'Placas base', description: 'Placas base para plataformas AMD e Intel.' },
  'mobo/amd': { name: 'Placas base AMD', description: 'Placas base compatibles con plataformas AMD.' },
  'mobo/intel': { name: 'Placas base Intel', description: 'Placas base compatibles con plataformas Intel.' },
  graficas: { name: 'Tarjetas gráficas', description: 'Tarjetas gráficas para gaming, creación de contenido y trabajo profesional.' },
  nvidia: { name: 'Tarjetas gráficas NVIDIA', description: 'Tarjetas gráficas NVIDIA disponibles en PCSystemStore.' },
  amd: { name: 'Tarjetas gráficas AMD', description: 'Tarjetas gráficas AMD Radeon disponibles en PCSystemStore.' },
  ram: { name: 'Memorias RAM', description: 'Memorias RAM para actualizar o ensamblar tu computadora.' },
  ddr4: { name: 'Memorias DDR4', description: 'Memorias RAM DDR4 disponibles en PCSystemStore.' },
  ddr5: { name: 'Memorias DDR5', description: 'Memorias RAM DDR5 disponibles en PCSystemStore.' },
  almacenamiento: { name: 'Almacenamiento', description: 'Unidades SSD, NVMe y almacenamiento para computadoras.' },
  solido: { name: 'Unidades de estado sólido', description: 'Unidades SSD y NVMe para mejorar el rendimiento de tu equipo.' },
  sata: { name: 'Almacenamiento SATA', description: 'Discos y unidades con interfaz SATA.' },
  torres: { name: 'Gabinetes para PC', description: 'Gabinetes y torres para ensamblar computadoras.' },
  fuentes: { name: 'Fuentes de poder', description: 'Fuentes de alimentación para computadoras y equipos gaming.' },
  refrigeracion: { name: 'Refrigeración para PC', description: 'Soluciones de refrigeración por aire y líquida para computadoras.' },
  ordenadores: { name: 'Computadoras y laptops', description: 'Computadoras de escritorio, laptops y accesorios para trabajo y gaming.' },
  pcs: { name: 'PCs de escritorio', description: 'Computadoras de escritorio para trabajo, estudio y gaming.' },
  'pc-gaming': { name: 'PC gaming', description: 'Computadoras configuradas para gaming.' },
  laptops: { name: 'Laptops', description: 'Laptops para trabajo, estudio, creación de contenido y gaming.' },
  'laptop-accessorios': { name: 'Accesorios para laptops', description: 'Bases refrigeradoras, mochilas y accesorios para laptops.' },
  'bases-refrigeradoras': { name: 'Bases refrigeradoras', description: 'Bases de refrigeración para laptops.' },
  mochilas: { name: 'Mochilas para laptops', description: 'Mochilas para transportar laptops y accesorios.' },
  perifericos: { name: 'Periféricos', description: 'Monitores, teclados, mouse y accesorios para tu espacio de trabajo o gaming.' },
  monitores: { name: 'Monitores', description: 'Monitores para trabajo, entretenimiento y gaming.' },
  teclados: { name: 'Teclados', description: 'Teclados para productividad y gaming.' },
  mouse: { name: 'Mouse', description: 'Mouse para trabajo, productividad y gaming.' },
  mousepad: { name: 'Mousepads', description: 'Mousepads para escritorio y gaming.' },
  chairs: { name: 'Sillas gamer', description: 'Sillas para espacios gaming y de trabajo.' },
  'mesa-gamer': { name: 'Mesas gamer', description: 'Mesas para organizar equipos gaming y estaciones de trabajo.' },
  webcams: { name: 'Webcams', description: 'Cámaras web para videollamadas y creación de contenido.' },
  capturadoras: { name: 'Capturadoras', description: 'Capturadoras de video para streaming y creación de contenido.' },
  'cables-y-hub': { name: 'Cables y hubs', description: 'Cables, adaptadores y hubs para computadoras y periféricos.' },
  audio: { name: 'Audio', description: 'Audífonos, micrófonos y parlantes para entretenimiento y comunicación.' },
  audifonos: { name: 'Audífonos', description: 'Audífonos para gaming, música y comunicación.' },
  speakers: { name: 'Parlantes', description: 'Parlantes para computadoras y entretenimiento.' },
  microphones: { name: 'Micrófonos', description: 'Micrófonos para comunicación, streaming y creación de contenido.' },
  proteccion: { name: 'Protección eléctrica', description: 'Equipos de protección eléctrica para computadoras y accesorios.' },
  ups: { name: 'UPS', description: 'Sistemas de alimentación ininterrumpida para proteger tus equipos.' },
  supresores: { name: 'Supresores de picos', description: 'Supresores para proteger equipos ante variaciones eléctricas.' },
  estabilizadores: { name: 'Estabilizadores', description: 'Estabilizadores de voltaje para equipos electrónicos.' },
};

export const PUBLIC_STATIC_ROUTES = [
  '/', '/tienda', '/ofertas', '/contactar', '/contactos-ayuda', '/devoluciones-garantia',
  '/medios-pago', '/politica-privacidad', '/politica-reembolso', '/quienes-somos',
  '/terminos-condiciones', '/armar-pc',
] as const;

export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  const url = absoluteUrl(path);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: { title, description, url, siteName: 'PCSystemStore', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export function privateMetadata(): Metadata {
  return { robots: { index: false, follow: false, nocache: true } };
}

export function categoryMetadata(slug: string): Metadata | null {
  const category = CATEGORY_SEO[slug];
  if (!category) return null;
  return publicPageMetadata(
    `${category.name} | PCSystemStore`,
    category.description,
    `/categoria/${slug.split('/').map(encodeURIComponent).join('/')}`,
  );
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteUrl(item.path),
    })),
  };
}

export function organizationJsonLd(storeName: string, logoPath: string) {
  let logo = absoluteUrl('/icon.png');
  try {
    const candidate = new URL(logoPath);
    if (candidate.protocol === 'https:') logo = candidate.toString();
  } catch {
    if (logoPath.startsWith('/')) logo = absoluteUrl(logoPath);
  }

  return {
    '@context': 'https://schema.org', '@type': 'Organization', name: storeName,
    url: getSiteUrl(), logo, telephone: '+51 959 139 676',
    address: { '@type': 'PostalAddress', streetAddress: 'Av. Giráldez 274, Centro, Tienda E-6', addressLocality: 'Huancayo', addressCountry: 'PE' },
    sameAs: ['https://www.facebook.com/PCSystemStore', 'https://www.tiktok.com/@pcsystemstore', 'https://www.instagram.com/pc.system.store'],
  };
}
