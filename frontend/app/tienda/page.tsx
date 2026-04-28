import { FiClock, FiMapPin, FiPhone, FiShield } from 'react-icons/fi';

export default function TiendaPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      
      {/* Cabecera Simple */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-gray-900 mb-4">Nuestra Tienda en Huancayo</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Ven a conocer el showroom de hardware más completo de la ciudad. Asesoramiento personalizado y los mejores equipos en exhibición.
        </p>
      </div>

      {/* Imagen Principal (Placeholder) */}
      <div className="w-full h-[400px] bg-gray-200 rounded-2xl mb-12 flex items-center justify-center relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        <span className="text-gray-500 font-bold text-xl relative z-10 bg-white/80 px-6 py-3 rounded-full">
          [FOTO REAL DEL LOCAL/FACHADA AQUÍ]
        </span>
        {/* <img src="/foto-tienda.jpg" alt="Fachada PC System Store" className="object-cover w-full h-full" /> */}
      </div>

      {/* Grid de Información */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {/* Dirección */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-50 text-brand-cyan rounded-full flex items-center justify-center text-3xl mb-4">
            <FiMapPin />
          </div>
          <h3 className="font-bold text-lg mb-2">Ubicación</h3>
          <p className="text-gray-600">Av. Giráldez 123, Centro de Huancayo. <br/> (Frente a la Plaza Constitución)</p>
        </div>

        {/* Horarios */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-3xl mb-4">
            <FiClock />
          </div>
          <h3 className="font-bold text-lg mb-2">Horarios de Atención</h3>
          <p className="text-gray-600">
            Lunes a Sábado: 10am - 8pm <br/>
            Domingos: Previa Cita
          </p>
        </div>

        {/* Contacto */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center text-3xl mb-4">
            <FiPhone />
          </div>
          <h3 className="font-bold text-lg mb-2">Contacto Directo</h3>
          <p className="text-gray-600 font-bold text-lg">WhatsApp: 999-123-456</p>
          <p className="text-gray-600 text-sm">Ventas y Soporte</p>
        </div>
      </div>

      {/* Sección de Confianza */}
      <div className="bg-gray-900 rounded-3xl p-10 text-white flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center gap-6 mb-6 md:mb-0">
          <FiShield className="text-6xl text-brand-cyan" />
          <div>
            <h2 className="text-2xl font-bold mb-2">Garantía Real y Soporte Local</h2>
            <p className="text-gray-300 max-w-md">Olvídate de trámites engorrosos. Si falla, lo solucionamos aquí mismo en nuestra tienda física.</p>
          </div>
        </div>
        <button className="bg-brand-cyan text-gray-900 font-bold px-8 py-4 rounded-xl hover:scale-105 transition">
          Ver Ubicación en Maps
        </button>
      </div>

    </div>
  );
}