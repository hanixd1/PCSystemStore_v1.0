'use client';

import { useState } from 'react';
import Link from 'next/link';

const WHO_WE_ARE_LINKS = [
  { label: 'Sobre PCSystemStore', href: '/quienes-somos' },
  { label: 'Política de Privacidad', href: '/politica-privacidad' },
  { label: 'Política de Reembolso', href: '/politica-reembolso' },
  { label: 'Términos y Condiciones', href: '/terminos-condiciones' },
];

const CONTACT_LINKS = [
  { label: 'Escríbenos', href: '/contactar' },
  { label: 'Nuestra Tienda', href: '/tienda' },
  { label: 'Devoluciones y Garantía', href: '/devoluciones-garantia' },
];

const SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/PCSystemStore',
  tiktok: 'https://www.tiktok.com/@pcsystemstore',
  instagram: 'https://www.instagram.com/pc.system.store',
};

const PAYMENT_METHODS_IMAGE = '/payment-methods.png';

function FooterTitle({ children }: { children: string }) {
  return (
    <div>
      <h2 className="text-sm font-extrabold uppercase tracking-[0.28em] text-white">{children}</h2>
      <div className="mt-3 h-0.5 w-10 bg-cyan-200" />
    </div>
  );
}

function InternalLinksColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <FooterTitle>{title}</FooterTitle>
      <ul className="mt-5 space-y-3">
        {links.map((link) => (
          <li key={`${title}-${link.label}`}>
            <Link
              href={link.href}
              className="text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialColumn() {
  const links = [
    {
      label: 'Facebook',
      href: SOCIAL_LINKS.facebook,
      ariaLabel: 'Visitar Facebook de PCSystemStore',
    },
    {
      label: 'TikTok',
      href: SOCIAL_LINKS.tiktok,
      ariaLabel: 'Visitar TikTok de PCSystemStore',
    },
    {
      label: 'Instagram',
      href: SOCIAL_LINKS.instagram,
      ariaLabel: 'Visitar Instagram de PCSystemStore',
    },
  ];

  return (
    <div>
      <FooterTitle>SÍGUENOS</FooterTitle>
      <ul className="mt-5 space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.ariaLabel}
              className="text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaymentColumn() {
  const [showPaymentImage, setShowPaymentImage] = useState(true);

  return (
    <div>
      <FooterTitle>MEDIOS DE PAGO</FooterTitle>
      <ul className="mt-5 space-y-3 text-sm font-medium text-white/80">
        <li>Transferencias</li>
        <li>Efectivo</li>
      </ul>
      <div className="mt-5">
        {showPaymentImage ? (
          <img
            src={PAYMENT_METHODS_IMAGE}
            alt="Medios de pago aceptados por PCSystemStore"
            className="h-auto max-w-[150px] object-contain sm:max-w-[170px]"
            onError={() => setShowPaymentImage(false)}
          />
        ) : (
          <p className="max-w-[220px] border border-dashed border-white/50 px-3 py-2 text-xs font-medium text-white/80">
            Próximamente se mostrarán los medios de pago disponibles.
          </p>
        )}
      </div>
    </div>
  );
}

export default function PublicFooter() {
  return (
    <footer className="border-t-2 border-cyan-600 bg-cyan-700">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <InternalLinksColumn title="QUIÉNES SOMOS" links={WHO_WE_ARE_LINKS} />
        <InternalLinksColumn title="CONTACTAR" links={CONTACT_LINKS} />
        <SocialColumn />
        <PaymentColumn />
      </div>
    </footer>
  );
}
