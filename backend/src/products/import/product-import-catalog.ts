import { BadRequestException } from '@nestjs/common';
import { normalizeHeader, normalizeText } from './product-import-normalizers';
import type { ProductImportCategoryGroup } from './product-import.types';

export type ProductImportOption = {
  label: string;
  category: string;
};

export const PRODUCT_TYPES_BY_GROUP: Record<ProductImportCategoryGroup, ProductImportOption[]> = {
  COMPONENTES: [
    { label: 'Procesador (CPU)', category: 'CPU' },
    { label: 'Placa Madre', category: 'MOTHERBOARD' },
    { label: 'Memoria RAM', category: 'RAM' },
    { label: 'Tarjeta de Video', category: 'GPU' },
    { label: 'Fuente de Poder', category: 'PSU' },
    { label: 'Gabinete / Case', category: 'CASE' },
    { label: 'Refrigeracion', category: 'COOLER' },
    { label: 'Almacenamiento', category: 'STORAGE' },
  ],
  ORDENADORES: [
    { label: 'Laptop / Portatil', category: 'LAPTOP' },
    { label: 'PC de Escritorio', category: 'PC_DESKTOP' },
    { label: 'Software / Licencia', category: 'SOFTWARE' },
    { label: 'Base refrigeradora', category: 'LAPTOP_COOLING_BASE' },
    { label: 'Mochila', category: 'BACKPACK' },
  ],
  PERIFERICOS: [
    { label: 'Monitor', category: 'MONITOR' },
    { label: 'Teclado', category: 'KEYBOARD' },
    { label: 'Mouse', category: 'MOUSE' },
    { label: 'Mousepad', category: 'MOUSEPAD' },
    { label: 'Silla Gaming', category: 'CHAIR' },
    { label: 'Mesa Gamer', category: 'GAMING_DESK' },
    { label: 'Webcam', category: 'WEBCAM' },
    { label: 'Capturadora', category: 'CAPTURE_CARD' },
    { label: 'Cables y Hub', category: 'CABLE_HUB' },
  ],
  AUDIO: [
    { label: 'Audifonos / Headset', category: 'HEADSET' },
    { label: 'Microfono', category: 'MICROPHONE' },
    { label: 'Parlantes', category: 'SPEAKER' },
  ],
};

export const REQUIRED_GENERAL_COLUMNS = [
  'nombre',
  'marca',
  'precio',
  'stock',
  'descripcion',
  'imagenPrincipal',
];

export const TEMPLATE_GENERAL_COLUMNS = [
  'nombre',
  'sku',
  'marca',
  'precio',
  'stock',
  'descripcion',
  'imagenPrincipal',
  'imagenesArchivos',
];

export function resolveImportProductType(category: unknown, productType: unknown) {
  const group = normalizeText(category).toUpperCase() as ProductImportCategoryGroup;
  const normalizedProductType = normalizeHeader(productType);
  const options = PRODUCT_TYPES_BY_GROUP[group];

  if (!options) {
    throw new BadRequestException('Selecciona una categoria principal valida.');
  }

  const resolved = options.find(
    (option) => normalizeHeader(option.label) === normalizedProductType,
  );
  if (!resolved) {
    throw new BadRequestException('Selecciona un tipo de producto valido para la categoria.');
  }

  return {
    group,
    label: resolved.label,
    category: resolved.category,
  };
}
