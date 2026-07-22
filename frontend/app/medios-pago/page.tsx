import StaticInfoPage from '@/components/StaticInfoPage';
import { publicPageMetadata } from '@/lib/seo';

export const metadata = publicPageMetadata(
  'Medios de pago | PCSystemStore',
  'Información pública sobre los medios de pago disponibles en PCSystemStore.',
  '/medios-pago',
);

export default function MediosPagoPage() {
  return (
    <StaticInfoPage
      title="Medios de Pago"
      description="Esta sección será actualizada con las condiciones para pagos por transferencia bancaria y pagos en efectivo."
    />
  );
}
