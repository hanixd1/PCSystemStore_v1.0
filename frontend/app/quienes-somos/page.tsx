import StaticInfoPage from '@/components/StaticInfoPage';
import { publicPageMetadata } from '@/lib/seo';

export const metadata = publicPageMetadata(
  'Quiénes somos | PCSystemStore',
  'Información institucional y propuesta de PCSystemStore para clientes de hardware y tecnología.',
  '/quienes-somos',
);

export default function QuienesSomosPage() {
  return (
    <StaticInfoPage
      title="Quiénes Somos"
      description="Esta sección será actualizada con la historia, enfoque comercial y propuesta de valor oficial de PCSystemStore."
    />
  );
}
