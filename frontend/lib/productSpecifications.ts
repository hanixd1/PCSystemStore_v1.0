export type SpecificationRow = {
  label: string;
  value: string;
};

type SpecValue = string | number | boolean | string[] | null | undefined;

const MAX_SPEC_VALUE_LENGTH = 50;

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
  WEBCAM: 'webcamSpecs',
  CAPTURE_CARD: 'captureCardSpecs',
  CABLE_HUB: 'cableHubSpecs',
  LAPTOP_COOLING_BASE: 'laptopCoolingBaseSpecs',
  BACKPACK: 'backpackSpecs',
};

const SPEC_FIELD_MAP: Record<string, Array<[string, string, string?]>> = {
  CPU: [
    ['Marca', 'brand'],
    ['Socket', 'socket'],
    ['TDP base', 'baseTdpWatts', 'W'],
    ['TDP maximo', 'tdp', 'W'],
    ['Nucleos', 'cores'],
    ['Threads', 'threads'],
    ['Frecuencia', 'frequency', 'GHz'],
    ['Graficos integrados', 'integratedGraphics'],
    ['Incluye cooler', 'includesCooler'],
  ],
  MOTHERBOARD: [
    ['Marca', 'brand'],
    ['Socket', 'socket'],
    ['Tipo de memoria', 'memoryType'],
    ['Formato', 'formFactor'],
    ['Slots de memoria', 'memorySlots'],
    ['Slots M.2', 'm2Slots'],
    ['Tamanos M.2 soportados', 'supportedM2FormFactors'],
  ],
  RAM: [
    ['Tipo de memoria', 'memoryType'],
    ['Cantidad por módulo', 'capacity', 'GB'],
    ['Frecuencia', 'speed', 'MHz'],
    ['Modulos', 'modules'],
    ['RGB', 'hasRGB'],
  ],
  GPU: [
    ['Marca ensambladora', 'brand'],
    ['Chipset', 'chipset'],
    ['VRAM', 'vram', 'GB'],
    ['Longitud', 'length', 'mm'],
    ['Consumo real', 'gpuPowerWatts', 'W'],
    ['PSU recomendada', 'recommendedPsuWatts', 'W'],
    ['Ventiladores', 'fans'],
  ],
  PSU: [
    ['Marca', 'brand'],
    ['Potencia', 'wattage', 'W'],
    ['Certificacion', 'certification'],
    ['Modularidad', 'modular'],
    ['Formato', 'formFactor'],
  ],
  CASE: [
    ['Marca', 'brand'],
    ['Formato soportado', 'formFactor'],
    ['Largo maximo de GPU', 'maxGpuLength', 'mm'],
    ['Incluye fuente', 'includesPsu'],
    ['Soporte radiador liquido', 'radiatorSupportMm', 'mm'],
    ['Ventiladores incluidos', 'includedFans'],
  ],
  COOLER: [
    ['Marca', 'brand'],
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
    ['Marca', 'brand'],
    ['Procesador', 'processor'],
    ['RAM', 'ram'],
    ['Almacenamiento', 'storage'],
    ['Tamaño de pantalla', 'screenSize'],
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
    ['Marca', 'brand'],
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
    ['Marca', 'brand'],
    ['Conexion', 'connection'],
    ['Conectividad soportada', 'supportedConnections'],
    ['Driver', 'driverSize', 'mm'],
    ['Impedancia', 'impedance', 'ohm'],
    ['Tipo de microfono', 'micType'],
    ['Cancelacion de ruido', 'noiseCancel'],
    ['RGB', 'hasRGB'],
  ],
  MICROPHONE: [
    ['Marca', 'brand'],
    ['Conexion', 'connection'],
    ['Tipo de microfono', 'micType'],
    ['RGB', 'hasRGB'],
  ],
  SPEAKER: [
    ['Marca', 'brand'],
    ['Conexion', 'connection'],
    ['Potencia', 'wattage', 'W'],
    ['RGB', 'hasRGB'],
  ],
  WEBCAM: [
    ['Marca', 'brand'],
    ['Resolucion', 'resolution'],
    ['FPS', 'fps', 'FPS'],
  ],
  CAPTURE_CARD: [
    ['Marca', 'brand'],
    ['Resolucion', 'resolution'],
    ['FPS', 'fps', 'FPS'],
  ],
  CABLE_HUB: [
    ['Marca', 'brand'],
    ['Tipo', 'type'],
    ['Tipo de cable', 'cableType'],
    ['Largo', 'cableLengthMeters', 'm'],
    ['Tipo de entrada', 'hubInputType'],
    ['Salida HDMI', 'hasHdmiOutput'],
    ['Salida RJ45', 'hasRj45Output'],
  ],
  LAPTOP_COOLING_BASE: [
    ['Marca', 'brand'],
    ['Cantidad de ventiladores', 'fanCount'],
    ['Conectividad', 'connectivity'],
  ],
  BACKPACK: [
    ['Marca', 'brand'],
    ['Color', 'color'],
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

function isDigit(char: string) {
  return char >= '0' && char <= '9';
}

function skipSpaces(text: string, startIndex: number) {
  let index = startIndex;
  while (index < text.length && text[index] === ' ') {
    index += 1;
  }

  return index;
}

function formatCapacityOccurrences(value: SpecValue, allowedUnits: string[]) {
  const raw = String(value ?? '').slice(0, MAX_SPEC_VALUE_LENGTH).trim();
  if (!raw) return '';

  let output = '';
  let index = 0;
  let changed = false;

  while (index < raw.length) {
    if (!isDigit(raw[index])) {
      output += raw[index];
      index += 1;
      continue;
    }

    let digits = '';
    while (index < raw.length && isDigit(raw[index])) {
      digits += raw[index];
      index += 1;
    }

    const unitStart = skipSpaces(raw, index);
    const matchedUnit = allowedUnits.find(
      (unit) => raw.slice(unitStart, unitStart + unit.length).toUpperCase() === unit,
    );

    if (matchedUnit) {
      output += `${digits} ${matchedUnit}`;
      index = unitStart + matchedUnit.length;
      changed = true;
      continue;
    }

    output += digits;
  }

  return changed ? output.trim() : raw;
}

function formatRamValue(value: SpecValue) {
  return formatCapacityOccurrences(value, ['GB']);
}

function formatLaptopValue(key: string, value: SpecValue, unit?: string) {
  if (key === 'ram') {
    return formatRamValue(value);
  }

  if (key === 'storage') {
    return formatCapacityOccurrences(value, ['GB', 'TB']);
  }

  if (key === 'screenSize') {
    const screenSize = String(value || '').replace(/"/g, '').trim();
    return screenSize ? `${screenSize}"` : '';
  }

  return formatValue(value, unit);
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
        if (key === 'hasLighting') return specs.hasLighting !== null && specs.hasLighting !== undefined;
        if (key === 'switchType') {
          return specs.keyboardType === 'Mecanico' || specs.keyboardType === 'Magnetico';
        }
        if (key === 'keyboardFormFactor') return true;
      }

      if (product.category === 'MOUSE') {
        if (['buttonCount', 'dpi', 'pollingRateHz'].includes(key)) return specs.mouseType === 'Gamer';
      }

      return true;
    })
    .map(([label, key, unit]) => {
      const value = product.category === 'GPU' && key === 'gpuPowerWatts'
        ? specs.gpuPowerWatts ?? specs.tdp
        : specs[key];

      return {
        label,
        value: product.category === 'LAPTOP' ? formatLaptopValue(key, value, unit) : formatValue(value, unit),
      };
    })
    .filter((row) => hasValue(row.value));

  if (mappedRows.length > 0) {
    return mappedRows;
  }

  return buildGenericRows(specs);
}
