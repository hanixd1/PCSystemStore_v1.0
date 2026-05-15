'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FiX, FiChevronRight, FiChevronDown, FiChevronUp,
  FiCpu, FiMousePointer, FiHeadphones, FiTool, FiHome
} from 'react-icons/fi';
import { MdComputer } from 'react-icons/md';

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

type MenuItem = {
  name: string;
  href?: string;
  children?: MenuItem[];
};

type Category = {
  id: string;
  name: string;
  icon: any;
  items: MenuItem[];
};

const MegaMenu = ({ isOpen, onClose }: MegaMenuProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Only ONE item expanded at a time (accordion auto-close)
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const toggleAccordion = (itemName: string) => {
    setExpandedItem(prev => (prev === itemName ? null : itemName));
  };

  // When switching category, also reset the expanded accordion
  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
    setExpandedItem(null);
  };

  /* ================= CATEGORIAS ================= */

  const CATEGORIES: Category[] = [
    {
      id: 'componentes',
      name: 'Componentes',
      icon: FiCpu,
      items: [
        { name: 'Configurador de PCs', href: '/builder' },
        {
          name: 'Procesadores',
          href: '/categoria/cpu',
          children: [
            { name: 'INTEL', href: '/categoria/cpu/intel' },
            { name: 'AMD', href: '/categoria/cpu/amd' }
          ]
        },
        {
          name: 'Placas Base',
          href: '/categoria/mobo',
          children: [
            { name: 'INTEL', href: '/categoria/mobo/intel' },
            { name: 'AMD', href: '/categoria/mobo/amd' }
          ]
        },
        {
          name: 'Tarjetas graficas',
          href: '/categoria/graficas',
          children: [
            { name: 'Graficas NVIDIA', href: '/categoria/NVIDIA' },
            { name: 'Graficas AMD', href: '/categoria/AMD' }
          ]
        },
        {
          name: 'Memorias RAM',
          href: '/categoria/ram',
          children: [
            { name: 'RAM DDR4', href: '/categoria/ddr4' },
            { name: 'RAM DDR5', href: '/categoria/ddr5' }
          ]
        },
        {
          name: 'Almacenamiento',
          href: '/categoria/almacenamiento',
          children: [
            { name: 'Disco M.2', href: '/categoria/solido' },
            { name: 'Disco Sata', href: '/categoria/sata' },
            { name: 'Disco Externo', href: '/categoria/externo' }
          ]
        },
        {
          name: 'Torres / Gabinetes',
          href: '/categoria/torres',
          children: [
            { name: 'Con fuente', href: '/categoria/cfuente' },
            { name: 'Sin fuente', href: '/categoria/sfuente' }
          ]
        },
        {
          name: 'Fuentes de alimentacion',
          href: '/categoria/fuentes',
          children: [
            { name: 'Fuente Certificada', href: '/categoria/certificada' },
            { name: 'Fuente Real', href: '/categoria/real' }
          ]
        },
        {
          name: 'Refrigeracion',
          href: '/categoria/refrigeracion',
          children: [
            { name: 'Refrigeracion Liquida', href: '/categoria/liquida' },
            { name: 'Refrigeracion de Torre', href: '/categoria/torre' }
          ]
        }
      ]
    },

    {
      id: 'ordenadores',
      name: 'Ordenadores',
      icon: MdComputer,
      items: [
        {
          name: 'PCs',
          href: '/categoria/pcs',
          children: [
            { name: 'PC Oficina', href: '/categoria/pc-oficina' },
            { name: 'PC Gaming', href: '/categoria/pc-gaming' }
          ]
        },
        {
          name: 'Laptops',
          href: '/categoria/laptops',
          children: [
            { name: 'Laptops Oficina', href: '/categoria/laptop-oficina' },
            { name: 'Laptops Gaming', href: '/categoria/laptop-gaming' }
          ]
        },
        {
          name: 'Software',
          href: '/categoria/software',
          children: [
            { name: 'Antivirus', href: '/categoria/antivirus' },
            { name: 'Licencias', href: '/categoria/licencias' }
          ]
        },
        {
          name: 'Accesorios para portatiles',
          href: '/categoria/laptop-accessorios',
          children: [
            { name: 'Bases refrigeradoras', href: '/categoria/bases-refrigeradoras' },
            { name: 'Mochilas', href: '/categoria/mochilas' }
          ]
        }
      ]
    },

    {
      id: 'perifericos',
      name: 'Perifericos',
      icon: FiMousePointer,
      items: [
        {
          name: 'Monitores',
          href: '/categoria/monitores',
          children: [
            { name: 'Monitores Gamer', href: '/categoria/monitores-gamer' },
            { name: 'Monitores', href: '/categoria/monitores' }
          ]
        },
        {
          name: 'Teclados',
          href: '/categoria/teclados',
          children: [
            { name: 'Teclados Gamer', href: '/categoria/teclados-gamer' },
            { name: 'Teclados', href: '/categoria/teclados' }
          ]
        },
        {
          name: 'Mouse',
          href: '/categoria/mouse',
          children: [
            { name: 'Mouse Gamer', href: '/categoria/mouse-gamer' },
            { name: 'Mouse', href: '/categoria/mouse' }
          ]
        },
        { name: 'Mousepads', href: '/categoria/mousepad' },
        { name: 'Sillas Gaming', href: '/categoria/chairs' },
        { name: 'Mesas Gamer', href: '/categoria/mesa-gamer' },
        { name: 'Webcams', href: '/categoria/webcams' },
        { name: 'Capturadoras', href: '/categoria/capturadoras' },
        { name: 'Cables y Hub', href: '/categoria/cables-y-hub' },
        {
          name: 'Proteccion electrica',
          href: '/categoria/proteccion',
          children: [
            { name: 'UPS', href: '/categoria/ups' },
            { name: 'Supresores de picos', href: '/categoria/supresores' },
            { name: 'Estabilizadores', href: '/categoria/estabilizadores' }
          ]
        }
      ]
    },

    {
      id: 'audio',
      name: 'Audio',
      icon: FiHeadphones,
      items: [
        {
          name: 'Audifonos',
          href: '/categoria/audifonos',
          children: [
            { name: 'Audifonos Cableados', href: '/categoria/headsets-cableados' },
            { name: 'Audifonos Inalambricos', href: '/categoria/headsets-inalambricos' }
          ]
        },
        { name: 'Parlantes', href: '/categoria/speakers' },
        { name: 'Microfonos', href: '/categoria/microphones' }
      ]
    }
  ];

  const activeCategoryData = CATEGORIES.find(c => c.id === selectedCategory);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 left-0 h-full z-50 flex transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* PANEL IZQUIERDO */}
        <div className="w-80 bg-white h-full border-r flex flex-col">
          <div className="p-5 flex justify-between border-b shrink-0">
            <h2 className="font-bold text-lg">Menu</h2>
            <FiX onClick={onClose} className="text-2xl cursor-pointer" />
          </div>

          <div className="flex-1 overflow-y-auto">
            {CATEGORIES.map(cat => (
              <div
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`flex items-center justify-between px-6 py-3 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'text-cyan-800 font-semibold'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <cat.icon />
                  {cat.name}
                </div>
                <FiChevronRight />
              </div>
            ))}
          </div>

          <div className="p-6 border-t shrink-0">
            <Link
              href="/builder"
              onClick={onClose}
              className="flex items-center gap-3 text-cyan-800 font-semibold hover:underline"
            >
              <FiTool /> Configurador de PC
            </Link>
            <Link
              href="/tienda"
              onClick={onClose}
              className="flex items-center gap-3 mt-4 text-gray-600 hover:text-cyan-800"
            >
              <FiHome /> Tienda fisica
            </Link>
          </div>
        </div>

        {/* PANEL DERECHO */}
        <div
          className={`bg-white h-full border-l transition-all duration-300 ${
            selectedCategory ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'
          }`}
        >
          {activeCategoryData && (
            <div className="h-full flex flex-col">
              <div className="p-8 pb-4 shrink-0">
                <h3 className="text-xl font-bold">{activeCategoryData.name}</h3>
              </div>

              {/* SCROLLABLE ITEMS */}
              <div className="flex-1 overflow-y-auto px-8 pb-8">
                <div className="space-y-1">
                  {activeCategoryData.items.map((item, idx) => (
                    <div key={idx}>
                      {item.children ? (
                        <>
                          {/* Row: click name â†’ navigate, click arrow â†’ toggle */}
                          <div className="flex items-center justify-between py-2">
                            <Link
                              href={item.href || '#'}
                              onClick={onClose}
                              className="font-semibold hover:text-cyan-800 flex-1"
                            >
                              {item.name}
                            </Link>
                            <button
                              onClick={() => toggleAccordion(item.name)}
                              className="p-1 hover:text-cyan-800 shrink-0 ml-2"
                              aria-label={`Expandir ${item.name}`}
                            >
                              {expandedItem === item.name ? (
                                <FiChevronUp />
                              ) : (
                                <FiChevronDown />
                              )}
                            </button>
                          </div>

                          {expandedItem === item.name && (
                            <div className="ml-4 mb-2 space-y-2">
                              {item.children.map((sub, i) => (
                                <Link
                                  key={i}
                                  href={sub.href || '#'}
                                  onClick={onClose}
                                  className="block text-gray-500 hover:text-cyan-800 py-0.5"
                                >
                                  {sub.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <Link
                          href={item.href || '#'}
                          onClick={onClose}
                          className="block font-semibold hover:text-cyan-800 py-2"
                        >
                          {item.name}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MegaMenu;


