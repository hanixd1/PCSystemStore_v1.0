'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { resolveImageUrl } from '@/lib/product-images';
import type { PublicBanner } from '@/lib/catalog-server';

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

export default function HeroCarousel({ initialBanners }: { initialBanners: PublicBanner[] }) {
  const sliderRef = useRef<Slider | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const banners = initialBanners;

  useEffect(() => {
    if (banners.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      sliderRef.current?.slickNext();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [banners.length, currentSlide]);

  const settings = {
    dots: true,
    infinite: banners.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: false,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    afterChange: (index: number) => setCurrentSlide(index),
    appendDots: (dots: any) => (
      <div style={{ bottom: '20px' }}>
        <ul style={{ margin: '0px' }}> {dots} </ul>
      </div>
    ),
    customPaging: () => (
      <div className="mt-4 h-3 w-3 rounded-full bg-white/50 transition hover:bg-brand-cyan" />
    ),
  };

  if (banners.length === 0) return null;

  return (
    <div className="group relative h-[300px] w-full overflow-hidden bg-gray-900 md:h-[500px]">
      <Slider ref={sliderRef} {...settings}>
        {banners.map((banner) => (
          <div key={banner.id} className="relative h-[300px] outline-none md:h-[500px]">
            <BannerContent banner={banner} />
          </div>
        ))}
      </Slider>
    </div>
  );
}

function BannerContent({ banner }: { banner: PublicBanner }) {
  const bannerImage = resolveImageUrl(banner.imageUrl, { fallback: null });
  const content = (
    <div className="relative flex h-[300px] w-full items-center justify-center overflow-hidden md:h-[500px]">
      {bannerImage ? (
        <picture className="absolute inset-0">
          <img
            src={bannerImage}
            alt={banner.title}
            className="h-full w-full object-cover object-[center_60%]"
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
