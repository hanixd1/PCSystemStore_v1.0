import { FiClock, FiMapPin, FiShield } from 'react-icons/fi';
import StoreLocationMap from '@/components/StoreLocationMap';

const FALLBACK_WHATSAPP_NUMBER = '51959139676';
const STORE_WHATSAPP_QR_URL = '/qr-tienda.png';

function getWhatsappConfig() {
  const rawNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || FALLBACK_WHATSAPP_NUMBER;
  const normalizedNumber = rawNumber.replaceAll(' ', '').replaceAll('+', '');
  const displayNumber = normalizedNumber.startsWith('51')
    ? normalizedNumber.slice(2)
    : normalizedNumber;

  return {
    displayNumber,
    qrUrl: STORE_WHATSAPP_QR_URL,
    url: `https://wa.me/${normalizedNumber}`,
  };
}

export default function TiendaPage() {
  const whatsapp = getWhatsappConfig();

  return (
    <main className="bg-gray-50">
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-black text-gray-900">Nuestra Tienda en Huancayo</h1>
          <p className="mx-auto max-w-2xl text-xl text-gray-600">
            Ven a conocer el showroom de hardware m&aacute;s completo de la ciudad. Asesoramiento
            personalizado y los mejores equipos en exhibici&oacute;n.
          </p>
        </div>

        <StoreLocationMap />

        <section className="mx-auto max-w-6xl px-2 py-10 md:px-4 md:py-12">
          <div className="grid grid-cols-1 items-start gap-12 text-center md:grid-cols-3 md:gap-8">
            <div>
              <FiMapPin aria-hidden="true" className="mx-auto mb-5 h-12 w-12 text-gray-900" />
              <h3 className="text-xl font-extrabold text-gray-900">Ubicaci&oacute;n</h3>
              <p className="mt-4 text-base leading-relaxed text-gray-700">
                Av. Gir&aacute;ldez 274, Centro, Tienda E-6
                <br />
                de Huancayo.
                <br />
                (Frente a la tienda La Curacao)
              </p>
            </div>

            <div>
              <FiClock aria-hidden="true" className="mx-auto mb-5 h-12 w-12 text-gray-900" />
              <h3 className="text-xl font-extrabold text-gray-900">Horarios de Atenci&oacute;n</h3>
              <p className="mt-4 text-base leading-relaxed text-gray-700">
                Lunes a S&aacute;bado:
                <br />
                9:30 am - 7:00 pm
              </p>
            </div>

            <div className="flex flex-col items-center">
              {whatsapp.qrUrl ? (
                <img
                  src={whatsapp.qrUrl}
                  alt="C&oacute;digo QR de WhatsApp de PCSystemStore"
                  className="mb-4 h-40 w-40 object-contain md:h-44 md:w-44"
                />
              ) : (
                <div className="mb-4 flex h-40 w-40 items-center justify-center border-2 border-dashed border-gray-300 text-center text-sm font-semibold text-gray-500 md:h-44 md:w-44">
                  QR de WhatsApp pr&oacute;ximamente
                </div>
              )}

              <h3 className="text-2xl font-extrabold text-gray-900">Chatea con Nosotros</h3>
              <a
                href={whatsapp.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chatear con PCSystemStore por WhatsApp"
                className="mt-5 text-lg font-extrabold text-gray-900 transition hover:text-brand-cyan"
              >
                {whatsapp.displayNumber}
              </a>
            </div>
          </div>

          <div className="my-10 border-t border-gray-300" />

          <div className="flex flex-col items-center justify-center gap-5 text-center md:flex-row md:text-left">
            <FiShield aria-hidden="true" className="h-16 w-16 shrink-0 text-gray-900" />
            <div>
              <h3 className="text-2xl font-extrabold text-gray-900">
                Garant&iacute;a Real y Soporte Local
              </h3>
              <p className="mt-2 max-w-2xl text-lg leading-relaxed text-gray-700">
                Olv&iacute;date de tr&aacute;mites engorrosos. Si falla, lo solucionamos aqu&iacute;
                mismo en nuestra tienda f&iacute;sica.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
