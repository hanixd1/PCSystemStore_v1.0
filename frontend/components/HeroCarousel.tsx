'use client';

import Slider from "react-slick";
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

// Flechas personalizadas para que se vean modernas
const NextArrow = (props: any) => {
  const { onClick } = props;
  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/50 hover:bg-white p-3 rounded-full cursor-pointer transition text-gray-800 shadow-lg" onClick={onClick}>
      <FiChevronRight size={24} />
    </div>
  );
}

const PrevArrow = (props: any) => {
  const { onClick } = props;
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/50 hover:bg-white p-3 rounded-full cursor-pointer transition text-gray-800 shadow-lg" onClick={onClick}>
      <FiChevronLeft size={24} />
    </div>
  );
}

export default function HeroCarousel() {
  // Configuración del carrusel
  const settings = {
    dots: true,            // Puntitos abajo
    infinite: true,        // Bucle infinito
    speed: 500,            // Velocidad de transición
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,        // Cambia solo
    autoplaySpeed: 5000,   // Cada 5 segundos
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    appendDots: (dots: any) => ( // Personalizar los puntos
      <div style={{ bottom: "20px" }}>
        <ul style={{ margin: "0px" }}> {dots} </ul>
      </div>
    ),
    customPaging: (i: number) => (
      <div className="w-3 h-3 bg-white/50 rounded-full mt-4 hover:bg-brand-cyan transition"></div>
    )
  };

  // Simulamos los banners que subiría tu equipo de diseño
  const banners = [
      { id: 1, title: "Banner RTX Serie 40", color: "from-green-500 to-blue-600" },
      { id: 2, title: "Banner Procesadores Intel/AMD", color: "from-red-500 to-orange-500" },
      { id: 3, title: "Banner Periféricos Gaming", color: "from-purple-500 to-pink-500" },
  ];

  return (
    <div className="relative w-full h-[300px] md:h-[500px] overflow-hidden bg-gray-900 group">
      <Slider {...settings}>
        {banners.map((banner) => (
          <div key={banner.id} className="outline-none h-[300px] md:h-[500px] relative">
             {/* NOTA PARA EL FUTURO: 
                Aquí iría la etiqueta <img src={banner.imageUrl} ... /> 
                Por ahora usamos un degradado como placeholder.
             */}
            <div className={`w-full h-full bg-gradient-to-r ${banner.color} flex items-center justify-center text-white`}>
               <div className="text-center bg-black/30 p-10 backdrop-blur-sm rounded-xl border border-white/10">
                  <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tighter">{banner.title}</h2>
                  <p className="mt-4 bg-white/20 inline-block px-4 py-2 rounded-full text-sm font-medium">Espacio para imagen de marketing (1920x500)</p>
               </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}