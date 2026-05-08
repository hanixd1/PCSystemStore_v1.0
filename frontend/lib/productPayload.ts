type ProductFormState = Record<string, any>;

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function pick(source: ProductFormState, keys: string[]) {
  return keys.reduce<ProductFormState>((payload, key) => {
    const value = source[key];
    if (hasValue(value)) {
      payload[key] = value;
    }
    return payload;
  }, {});
}

function isTrue(value: unknown) {
  return value === true || value === 'true';
}

export function buildProductPayload(
  formData: ProductFormState,
  options?: { mode?: 'create' | 'edit'; clearSalePriceWhenOff?: boolean },
) {
  const saleEnabled = options?.mode === 'create' ? false : isTrue(formData.isOnSale);
  const payload: ProductFormState = {
    name: formData.name,
    description: formData.description,
    category: formData.category,
    price: formData.price,
    stock: formData.stock,
    isOnSale: saleEnabled,
    salePrice: saleEnabled ? formData.salePrice : null,
  };

  switch (formData.category) {
    case 'CPU':
      Object.assign(payload, pick(formData, ['cpuBrand', 'socket', 'tdp', 'cores', 'threads', 'frequency', 'integratedGraphics', 'includesCooler']));
      break;
    case 'MOTHERBOARD':
      Object.assign(payload, pick(formData, ['socket', 'formFactor', 'memoryType', 'memorySlots', 'm2Slots', 'supportedM2FormFactors']));
      break;
    case 'RAM':
      Object.assign(payload, pick(formData, ['memoryType', 'capacity', 'speed', 'modules', 'hasRGB']));
      break;
    case 'GPU':
      Object.assign(payload, pick(formData, ['chipset', 'vram', 'length', 'tdp', 'fans']));
      break;
    case 'PSU':
      Object.assign(payload, pick(formData, ['wattage', 'certification', 'modular', 'formFactor']));
      break;
    case 'CASE':
      Object.assign(payload, pick(formData, ['formFactor', 'maxGpuLength', 'includesPsu', 'includedFans']));
      break;
    case 'COOLER':
      Object.assign(payload, pick(formData, ['type', 'compatibleSockets', 'fanCount', 'radiatorSize', 'hasScreen', 'hasRGB', 'tdpCapacity', 'coolerHeight']));
      break;
    case 'STORAGE':
      Object.assign(payload, pick(formData, ['type', 'capacity', 'interface', 'readSpeed', 'writeSpeed', 'm2FormFactor']));
      break;
    case 'LAPTOP':
      Object.assign(payload, pick(formData, ['processor', 'ram', 'storage', 'screenSize', 'refreshRate', 'panelType', 'hasDedicatedGpu', 'gpuBrand', 'gpuModel', 'includesWindows']));
      break;
    case 'PC_DESKTOP':
      Object.assign(payload, pick(formData, ['processor', 'ram', 'storage', 'hasDedicatedGpu', 'gpuBrand', 'gpuModel', 'coolerType', 'psuWatts', 'caseModel']));
      break;
    case 'SOFTWARE':
      Object.assign(payload, pick(formData, ['licenseType', 'platform']));
      break;
    case 'MONITOR':
      Object.assign(payload, pick(formData, ['screenSize', 'resolution', 'panelType', 'refreshRate', 'responseTimeMs', 'ports', 'hasSpeakers']));
      break;
    case 'KEYBOARD':
      Object.assign(payload, pick(formData, ['brand', 'keyboardType', 'connections', 'layoutLanguage']));
      if (formData.keyboardType === 'Semi-mecanico') {
        Object.assign(payload, pick(formData, ['hasLighting']));
      }
      if (formData.keyboardType === 'Mecanico' || formData.keyboardType === 'Magnetico') {
        Object.assign(payload, pick(formData, ['switchType', 'keyboardFormFactor']));
      }
      break;
    case 'MOUSE':
      Object.assign(payload, pick(formData, ['brand', 'mouseType', 'connections', 'powerType', 'weightGrams']));
      if (formData.mouseType === 'Gamer') {
        Object.assign(payload, pick(formData, ['buttonCount', 'dpi', 'pollingRateHz']));
      }
      break;
    case 'MOUSEPAD':
      Object.assign(payload, pick(formData, ['brand', 'widthCm', 'lengthCm', 'hasLed']));
      break;
    case 'CHAIR':
      Object.assign(payload, pick(formData, ['brand', 'color', 'material', 'maxWeightKg']));
      break;
    case 'GAMING_DESK':
      Object.assign(payload, pick(formData, ['brand', 'color', 'surface', 'weightKg']));
      break;
    case 'HEADSET':
      Object.assign(payload, pick(formData, ['connection', 'driverSize', 'impedance', 'micType', 'noiseCancel', 'hasRGB']));
      break;
    case 'MICROPHONE':
      Object.assign(payload, pick(formData, ['connection', 'micType', 'hasRGB']));
      break;
    case 'SPEAKER':
      Object.assign(payload, pick(formData, ['connection', 'wattage', 'hasRGB']));
      break;
  }

  return payload;
}
