'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { api } from '@/lib/api';

type Banner = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
};

const fallbackBanners: Banner[] = [
  {
    id: 'fallback-pcsystemstore',
    title: 'PCSystemStore',
    imageUrl: '',
    linkUrl: '/tienda',
  },
];

const NextArrow = (props: any) => {
  const { onClick } = props;
  return (
    <button
      type="button"
      aria-label="Siguiente banner"
      className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/60 p-3 text-gray-800 shadow-lg transition hover:bg-white"
      onClick={onClick}
    >
      <FiChevronRight size={24} />
    </button>
  );
};

const PrevArrow = (props: any) => {
  const { onClick } = props;
  return (
    <button
      type="button"
      aria-label="Banner anterior"
      className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/60 p-3 text-gray-800 shadow-lg transition hover:bg-white"
      onClick={onClick}
    >
      <FiChevronLeft size={24} />
    </button>
  );
};

export default function HeroCarousel() {
  const [banners, setBanners] = useState<Banner[]>(fallbackBanners);

  useEffect(() => {
    let mounted = true;

    const loadBanners = async () => {
      try {
        const res = await api.get('/public/banners');
        if (mounted && Array.isArray(res.data) && res.data.length > 0) {
          setBanners(res.data);
        }
      } catch (error) {
        console.error('Error cargando banners publicos:', error);
      }
    };

    void loadBanners();

    return () => {
      mounted = false;
    };
  }, []);

  const settings = {
    dots: true,
    infinite: banners.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: banners.length > 1,
    autoplaySpeed: 5000,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    appendDots: (dots: any) => (
      <div style={{ bottom: '20px' }}>
        <ul style={{ margin: '0px' }}> {dots} </ul>
      </div>
    ),
    customPaging: () => (
      <div className="mt-4 h-3 w-3 rounded-full bg-white/50 transition hover:bg-brand-cyan" />
    ),
  };

  return (
    <div className="group relative h-[300px] w-full overflow-hidden bg-gray-900 md:h-[500px]">
      <Slider {...settings}>
        {banners.map((banner) => (
          <div key={banner.id} className="relative h-[300px] outline-none md:h-[500px]">
            <BannerContent banner={banner} />
          </div>
        ))}
      </Slider>
    </div>
  );
}

function BannerContent({ banner }: { banner: Banner }) {
  const content = (
    <div className="relative flex h-[300px] w-full items-center justify-center overflow-hidden md:h-[500px]">
      {banner.imageUrl ? (
        <picture className="absolute inset-0">
          <img
            src={banner.imageUrl}
            alt={banner.title}
            className="h-full w-full object-cover"
          />
        </picture>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-gray-900 to-cyan-500" />
      )}
    </div>
  );

  if (!banner.linkUrl) {
    return content;
  }

  if (banner.linkUrl.startsWith('/')) {
    return <Link href={banner.linkUrl}>{content}</Link>;
  }

  return (
    <a href={banner.linkUrl} target="_blank" rel="noreferrer">
      {content}
    </a>
  );
}
