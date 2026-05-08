export type SpecificationRow = {
  label: string;
  value: string;
};

type SpecValue = string | number | boolean | string[] | null | undefined;

const INTERNAL_FIELDS = new Set([
  'id',
  'productId',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'categoryId',
  'imageUrl',
  'images',
  'price',
  'stock',
  'sku',
  'slug',
  'product',
]);

const SPEC_RELATION_BY_CATEGORY: Record<string, string> = {
  CPU: 'cpuSpecs',
  MOTHERBOARD: 'motherboardSpecs',
  RAM: 'ramSpecs',
  GPU: 'gpuSpecs',
  PSU: 'psuSpecs',
  CASE: 'caseSpecs',
  COOLER: 'coolerSpecs',
  STORAGE: 'storageSpecs',
  LAPTOP: 'laptopSpecs',
  PC_DESKTOP: 'desktopSpecs',
  SOFTWARE: 'softwareSpecs',
  MONITOR: 'monitorSpecs',
  KEYBOARD: 'keyboardSpecs',
  MOUSE: 'mouseSpecs',
  MOUSEPAD: 'mousepadSpecs',
  CHAIR: 'chairSpecs',
  GAMING_DESK: 'gamingDeskSpecs',
  HEADSET: 'headsetSpecs',
  MICROPHONE: 'microphoneSpecs',
  SPEAKER: 'speakerSpecs',
};

const SPEC_FIELD_MAP: Record<string, Array<[string, string, string?]>> = {
  CPU: [
    ['Marca', 'brand'],
    ['Socket', 'socket'],
    ['TDP', 'tdp', 'W'],
    ['Nucleos', 'cores'],
    ['Threads', 'threads'],
    ['Frecuencia', 'frequency', 'GHz'],
    ['Graficos integrados', 'integratedGraphics'],
    ['Incluye cooler', 'includesCooler'],
  ],
  MOTHERBOARD: [
    ['Socket', 'socket'],
    ['Tipo de memoria', 'memoryType'],
    ['Formato', 'formFactor'],
    ['Slots de memoria', 'memorySlots'],
    ['Slots M.2', 'm2Slots'],
    ['Tamanos M.2 soportados', 'supportedM2FormFactors'],
  ],
  RAM: [
    ['Tipo de memoria', 'memoryType'],
    ['Capacidad', 'capacity', 'GB'],
    ['Frecuencia', 'speed', 'MHz'],
    ['Modulos', 'modules'],
    ['RGB', 'hasRGB'],
  ],
  GPU: [
    ['Chipset', 'chipset'],
    ['VRAM', 'vram', 'GB'],
    ['TDP / Consumo', 'tdp', 'W'],
    ['Longitud', 'length', 'mm'],
    ['Ventiladores', 'fans'],
  ],
  PSU: [
    ['Potencia', 'wattage', 'W'],
    ['Certificacion', 'certification'],
    ['Modularidad', 'modular'],
    ['Formato', 'formFactor'],
  ],
  CASE: [
    ['Formato soportado', 'formFactor'],
    ['Largo maximo de GPU', 'maxGpuLength', 'mm'],
    ['Incluye fuente', 'includesPsu'],
    ['Ventiladores incluidos', 'includedFans'],
  ],
  COOLER: [
    ['Tipo', 'type'],
    ['Sockets compatibles', 'compatibleSockets'],
    ['Socket compatible', 'socketSupport'],
    ['Ventiladores', 'fanCount'],
    ['Radiador', 'radiatorSize', 'mm'],
    ['TDP soportado', 'tdpCapacity', 'W'],
    ['Altura', 'coolerHeight', 'mm'],
    ['RGB', 'hasRGB'],
    ['Pantalla integrada', 'hasScreen'],
  ],
  STORAGE: [
    ['Tipo', 'type'],
    ['Capacidad', 'capacity', 'GB'],
    ['Interfaz', 'interface'],
    ['Velocidad de lectura', 'readSpeed', 'MB/s'],
    ['Velocidad de escritura', 'writeSpeed', 'MB/s'],
    ['Tamano M.2', 'm2FormFactor'],
  ],
  LAPTOP: [
    ['Procesador', 'processor'],
    ['RAM', 'ram'],
    ['Almacenamiento', 'storage'],
    ['Pantalla', 'screenSize'],
    ['Frecuencia de pantalla', 'refreshRate', 'Hz'],
    ['Tipo de panel', 'panelType'],
    ['Grafica dedicada', 'hasDedicatedGpu'],
    ['Marca GPU', 'gpuBrand'],
    ['Modelo GPU', 'gpuModel'],
    ['Windows de serie', 'includesWindows'],
  ],
  PC_DESKTOP: [
    ['Procesador', 'processor'],
    ['RAM', 'ram'],
    ['Almacenamiento', 'storage'],
    ['Grafica dedicada', 'hasDedicatedGpu'],
    ['Marca GPU', 'gpuBrand'],
    ['Modelo GPU', 'gpuModel'],
    ['Cooler incluido', 'coolerType'],
    ['Fuente de poder', 'psuWatts', 'W'],
    ['Modelo del case', 'caseModel'],
  ],
  SOFTWARE: [
    ['Tipo de licencia', 'licenseType'],
    ['Plataforma', 'platform'],
  ],
  MONITOR: [
    ['Tamano de pantalla', 'screenSize'],
    ['Resolucion', 'resolution'],
    ['Tipo de panel', 'panelType'],
    ['Frecuencia', 'refreshRate', 'Hz'],
    ['Tiempo de respuesta', 'responseTimeMs', 'ms'],
    ['Puertos', 'ports'],
    ['Parlantes integrados', 'hasSpeakers'],
  ],
  KEYBOARD: [
    ['Marca', 'brand'],
    ['Tipo de teclado', 'keyboardType'],
    ['Conexiones', 'connections'],
    ['Idioma / Layout', 'layoutLanguage'],
    ['Tiene luces', 'hasLighting'],
    ['Tipo de switch', 'switchType'],
    ['Formato', 'keyboardFormFactor'],
  ],
  MOUSE: [
    ['Marca', 'brand'],
    ['Tipo de mouse', 'mouseType'],
    ['Conexiones', 'connections'],
    ['Usa bateria o pila', 'powerType'],
    ['Peso', 'weightGrams', 'g'],
    ['Cantidad de botones', 'buttonCount'],
    ['DPI maximo', 'dpi', 'DPI'],
    ['Frecuencia de actualizacion', 'pollingRateHz', 'Hz'],
  ],
  MOUSEPAD: [
    ['Marca', 'brand'],
    ['Ancho', 'widthCm', 'mm'],
    ['Largo', 'lengthCm', 'mm'],
    ['Tiene LEDs', 'hasLed'],
  ],
  CHAIR: [
    ['Marca', 'brand'],
    ['Color', 'color'],
    ['Material', 'material'],
    ['Peso maximo soportado', 'maxWeightKg', 'kg'],
  ],
  GAMING_DESK: [
    ['Marca', 'brand'],
    ['Color', 'color'],
    ['Superficie', 'surface'],
    ['Peso', 'weightKg', 'kg'],
  ],
  HEADSET: [
    ['Conexion', 'connection'],
    ['Driver', 'driverSize', 'mm'],
    ['Impedancia', 'impedance', 'ohm'],
    ['Tipo de microfono', 'micType'],
    ['Cancelacion de ruido', 'noiseCancel'],
    ['RGB', 'hasRGB'],
  ],
  MICROPHONE: [
    ['Conexion', 'connection'],
    ['Tipo de microfono', 'micType'],
    ['RGB', 'hasRGB'],
  ],
  SPEAKER: [
    ['Conexion', 'connection'],
    ['Potencia', 'wattage', 'W'],
    ['RGB', 'hasRGB'],
  ],
};

function hasValue(value: SpecValue) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== null && value !== undefined && String(value).trim() !== '';
}

function formatLabel(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function formatValue(value: SpecValue, unit?: string) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'Si' : 'No';
  }

  if (!hasValue(value)) {
    return '';
  }

  const formattedValue = String(value).trim();
  if (!unit || formattedValue.toLowerCase().endsWith(unit.toLowerCase())) {
    return formattedValue;
  }

  return `${formattedValue} ${unit}`;
}

function getSpecsObject(product: Record<string, any>) {
  const relationName = SPEC_RELATION_BY_CATEGORY[product.category];
  if (relationName && product[relationName]) {
    return product[relationName];
  }

  return Object.keys(SPEC_RELATION_BY_CATEGORY)
    .map((category) => product[SPEC_RELATION_BY_CATEGORY[category]])
    .find(Boolean);
}

function buildGenericRows(specs: Record<string, SpecValue>): SpecificationRow[] {
  return Object.entries(specs)
    .filter(([key, value]) => !INTERNAL_FIELDS.has(key) && hasValue(value))
    .map(([key, value]) => ({
      label: formatLabel(key),
      value: formatValue(value),
    }));
}

export function buildSpecificationRows(product: Record<string, any>): SpecificationRow[] {
  const specs = getSpecsObject(product);
  if (!specs) {
    return [];
  }

  const fieldMap = SPEC_FIELD_MAP[product.category];
  if (!fieldMap) {
    return buildGenericRows(specs);
  }

  const mappedRows = fieldMap
    .filter(([, key]) => {
      if (product.category === 'KEYBOARD') {
        if (key === 'hasLighting') return specs.keyboardType === 'Semi-mecanico';
        if (key === 'switchType' || key === 'keyboardFormFactor') {
          return specs.keyboardType === 'Mecanico' || specs.keyboardType === 'Magnetico';
        }
      }

      if (product.category === 'MOUSE') {
        if (['buttonCount', 'dpi', 'pollingRateHz'].includes(key)) return specs.mouseType === 'Gamer';
      }

      return true;
    })
    .map(([label, key, unit]) => ({
      label,
      value: formatValue(specs[key], unit),
    }))
    .filter((row) => hasValue(row.value));

  if (mappedRows.length > 0) {
    return mappedRows;
  }

  return buildGenericRows(specs);
}
