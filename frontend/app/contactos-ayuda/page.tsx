import StaticInfoPage from '@/components/StaticInfoPage';
import { publicPageMetadata } from '@/lib/seo';

export const metadata = publicPageMetadata(
  'Contactos y ayuda | PCSystemStore',
  'Información de soporte, orientación de compra y canales de ayuda de PCSystemStore.',
  '/contactos-ayuda',
);

export default function ContactosAyudaPage() {
  return (
    <StaticInfoPage
      title="Contactos y ayuda"
      description="Esta sección será actualizada con información de soporte, orientación de compra y canales de ayuda para clientes."
    />
  );
}
