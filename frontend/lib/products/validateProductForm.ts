type ProductFormState = Record<string, any>;

type ValidateProductFormOptions = {
  mode?: 'create' | 'edit';
  imageCount?: number;
  requireImages?: boolean;
  nonNegativeFields?: Set<string>;
  noNegativeTextFields?: Set<string>;
  nameRegex?: RegExp;
  buildPayload?: (
    formData: ProductFormState,
    options?: { mode?: 'create' | 'edit' },
  ) => ProductFormState;
  cpuSocketsByBrand?: Record<string, string[]>;
};

const MIN_PRODUCT_DESCRIPTION_LENGTH = 10;
const MAX_PRODUCT_DESCRIPTION_LENGTH = 200;
const PRODUCT_NAME_MESSAGE =
  'El nombre debe tener entre 5 y 200 caracteres y puede incluir caracteres técnicos comunes.';
const TECHNICAL_PRODUCT_NAME_REGEX = /^[\p{L}\p{N}\s.,+\-_%/()[\]:;'"#&°@]{5,200}$/u;
const SKU_REGEX = /^[A-Z0-9_-]+$/;

function isSafeDescriptionText(value: string): boolean {
  return Array.from(value).every((char) => {
    const code = char.codePointAt(0);
    return code !== undefined && (code === 9 || code === 10 || code === 13 || code >= 32);
  });
}

export function validateProductForm(
  formData: ProductFormState,
  options: ValidateProductFormOptions = {},
) {
  const trimmedName = String(formData.name || '').trim();
  const trimmedDescription = String(formData.description || '').trim();
  const normalizedSku = String(formData.sku || '')
    .trim()
    .toUpperCase();

  if (normalizedSku.length < 3 || normalizedSku.length > 80) {
    return 'El SKU debe tener entre 3 y 80 caracteres.';
  }

  if (!SKU_REGEX.test(normalizedSku)) {
    return 'El SKU solo puede contener letras, números, guiones y guion bajo.';
  }

  const nameRegex = options.nameRegex || TECHNICAL_PRODUCT_NAME_REGEX;
  if (!nameRegex.test(trimmedName)) {
    return PRODUCT_NAME_MESSAGE;
  }

  if (
    trimmedDescription.length < MIN_PRODUCT_DESCRIPTION_LENGTH ||
    trimmedDescription.length > MAX_PRODUCT_DESCRIPTION_LENGTH
  ) {
    return 'La descripción debe tener entre 10 y 200 caracteres.';
  }

  if (!isSafeDescriptionText(trimmedDescription)) {
    return 'La descripción debe tener entre 10 y 200 caracteres y solo usar texto válido.';
  }

  if (Number(formData.price) <= 0) {
    return 'El precio debe ser mayor a 0.';
  }

  if (options.mode !== 'create' && formData.isOnSale === 'true') {
    const price = Number(formData.price);
    const salePrice = Number(formData.salePrice);
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      return 'El precio de oferta debe ser mayor a 0.';
    }

    if (salePrice >= price) {
      return 'El precio de oferta debe ser menor al precio normal.';
    }
  }

  if (!Number.isInteger(Number(formData.stock)) || Number(formData.stock) < 0) {
    return 'El stock debe ser un numero entero y no puede ser negativo.';
  }

  const payloadToValidate = options.buildPayload
    ? options.buildPayload(formData, { mode: options.mode })
    : formData;
  for (const field of options.nonNegativeFields || []) {
    if (!(field in payloadToValidate)) continue;
    const value = payloadToValidate[field];
    if (value !== '' && value !== null && value !== undefined && Number(value) < 0) {
      return `El campo ${field} no puede ser negativo.`;
    }
  }

  for (const field of options.noNegativeTextFields || []) {
    const value = String(formData[field] || '').trim();
    if (value.includes('-')) {
      return `El campo ${field} no puede contener valores negativos.`;
    }
  }

  if (options.requireImages && ((options.imageCount ?? 0) < 1 || (options.imageCount ?? 0) > 5)) {
    return 'Debes subir entre 1 y 5 imagenes.';
  }

  if (formData.category === 'CPU') {
    const allowedSockets = options.cpuSocketsByBrand?.[formData.cpuBrand] || [];
    if (!formData.cpuBrand || !allowedSockets.includes(formData.socket)) {
      return 'Selecciona una marca de procesador y un socket compatible.';
    }
    if (Number(formData.tdp) <= 0) {
      return 'El TDP del procesador debe ser mayor a 0.';
    }
  }

  if (formData.category === 'MOTHERBOARD' && !String(formData.brand || '').trim()) {
    return 'Selecciona la marca de la placa madre.';
  }

  if (formData.category === 'RAM') {
    if (!String(formData.brand || '').trim()) {
      return 'Selecciona la marca de la memoria RAM.';
    }
    if (!String(formData.memoryType || '').trim()) {
      return 'Selecciona el tipo de RAM.';
    }
    if (!String(formData.capacity || '').trim()) {
      return 'Selecciona la capacidad por modulo de la memoria RAM.';
    }
    if (!String(formData.speed || '').trim() || Number(formData.speed) <= 0) {
      return 'La frecuencia de la memoria RAM debe ser mayor a 0.';
    }
    if (!String(formData.modules || '').trim() || Number(formData.modules) <= 0) {
      return 'Selecciona los modulos de la memoria RAM.';
    }
  }

  if (formData.category === 'GPU') {
    if (!String(formData.brand || '').trim()) {
      return 'Selecciona la marca ensambladora de la tarjeta grafica.';
    }
    if (!String(formData.chipset || '').trim()) {
      return 'Selecciona el chipset de la tarjeta grafica.';
    }
    if (Number(formData.vram) <= 0) {
      return 'Selecciona la VRAM de la tarjeta grafica.';
    }
    if (!String(formData.typeVram || '').trim()) {
      return 'Selecciona el tipo de VRAM de la tarjeta grafica.';
    }
    if (Number(formData.length) <= 0) {
      return 'El largo de la tarjeta grafica debe ser mayor a 0.';
    }
    if (Number(formData.gpuPowerWatts || formData.tdp) <= 0) {
      return 'El consumo real de la GPU debe ser mayor a 0.';
    }
    if (
      formData.recommendedPsuWatts !== '' &&
      formData.recommendedPsuWatts !== undefined &&
      Number(formData.recommendedPsuWatts) <= 0
    ) {
      return 'La PSU recomendada debe ser mayor a 0.';
    }
    if (formData.fans !== '' && formData.fans !== undefined && Number(formData.fans) <= 0) {
      return 'La cantidad de ventiladores debe ser mayor a 0.';
    }
  }

  if (formData.category === 'COOLER') {
    if (!String(formData.brand || '').trim()) {
      return 'Selecciona la marca del cooler.';
    }
    if (!Array.isArray(formData.compatibleSockets) || formData.compatibleSockets.length === 0) {
      return 'Selecciona al menos un socket compatible para el cooler.';
    }
    if (Number(formData.tdpCapacity) <= 0) {
      return 'El TDP soportado del cooler debe ser mayor a 0.';
    }
    if (formData.type === 'Torre' && Number(formData.coolerHeight) <= 0) {
      return 'La altura del cooler de torre debe ser mayor a 0.';
    }
    if (
      (formData.type === 'Líquida' || formData.type === 'Liquida') &&
      Number(formData.radiatorSize) <= 0
    ) {
      return 'Selecciona el tamaño de radiador del cooler líquido.';
    }
  }

  if (formData.category === 'CASE') {
    if (!String(formData.brand || '').trim()) {
      return 'Selecciona la marca del gabinete.';
    }
    if (
      !Array.isArray(formData.supportedFormFactors) ||
      formData.supportedFormFactors.length === 0
    ) {
      return 'Selecciona al menos un soporte de placa para el gabinete.';
    }
    if (Number(formData.maxGpuLength) <= 0) {
      return 'El largo maximo de GPU del gabinete debe ser mayor a 0.';
    }
    if (Number(formData.maxCoolerHeight) <= 0) {
      return 'La altura maxima de cooler del gabinete debe ser mayor a 0.';
    }
    if (
      formData.includedFans !== '' &&
      formData.includedFans !== undefined &&
      Number(formData.includedFans) < 0
    ) {
      return 'La cantidad de ventiladores incluidos no puede ser negativa.';
    }
    if (
      !Array.isArray(formData.radiatorSupportMmValues) ||
      formData.radiatorSupportMmValues.length === 0
    ) {
      return 'Selecciona el soporte de radiador liquido del gabinete.';
    }
  }

  if (formData.category === 'PSU') {
    if (!String(formData.brand || '').trim()) {
      return 'Selecciona la marca de la fuente de poder.';
    }
    if (Number(formData.wattage) <= 0) {
      return 'La potencia de la fuente debe ser mayor a 0.';
    }
  }

  if (formData.category === 'LAPTOP' && !String(formData.brand || '').trim()) {
    return 'Selecciona la marca de la laptop.';
  }

  if (formData.category === 'MONITOR' && !String(formData.brand || '').trim()) {
    return 'Selecciona la marca del monitor.';
  }

  if (formData.category === 'STORAGE') {
    const isM2 = String(formData.type || '').includes('M.2');
    if (isM2 && !formData.m2FormFactor) {
      return 'Selecciona el tamano fisico M.2 del almacenamiento.';
    }
    if (Number(formData.capacity) <= 0) {
      return 'La capacidad del almacenamiento debe ser mayor a 0.';
    }
    if (Number(formData.readSpeed) <= 0) {
      return 'La velocidad de lectura debe ser mayor a 0.';
    }
    if (Number(formData.writeSpeed) <= 0) {
      return 'La velocidad de escritura debe ser mayor a 0.';
    }
  }

  if (
    formData.category === 'PC_DESKTOP' &&
    formData.psuWatts !== '' &&
    Number(formData.psuWatts) < 100
  ) {
    return 'La fuente de poder debe ser un numero positivo. Recomendado minimo 100W.';
  }

  if (
    formData.category === 'MONITOR' &&
    formData.responseTimeMs !== '' &&
    Number(formData.responseTimeMs) < 0.1
  ) {
    return 'El tiempo de respuesta debe ser un numero positivo mayor o igual a 0.1 ms.';
  }

  if (formData.category === 'KEYBOARD') {
    if (!String(formData.brand || '').trim()) {
      return 'Selecciona la marca del teclado.';
    }
    if (Array.isArray(formData.connections) && formData.connections.length === 0) {
      return 'Selecciona al menos una conexion para el teclado.';
    }
  }

  if (formData.category === 'MOUSE') {
    if (!String(formData.brand || '').trim()) {
      return 'Selecciona la marca del mouse.';
    }
    if (Array.isArray(formData.connections) && formData.connections.length === 0) {
      return 'Selecciona al menos una conexion para el mouse.';
    }
  }

  if (formData.category === 'MOUSEPAD' && !String(formData.brand || '').trim()) {
    return 'Selecciona la marca del mousepad.';
  }

  if (formData.category === 'LAPTOP_COOLING_BASE') {
    if (!String(formData.brand || '').trim()) {
      return 'Selecciona la marca de la base refrigeradora.';
    }
    if (!String(formData.fanCount || '').trim()) {
      return 'Selecciona la cantidad de ventiladores.';
    }
    if (!String(formData.connectivity || '').trim()) {
      return 'Selecciona la conectividad de la base refrigeradora.';
    }
  }

  if (formData.category === 'BACKPACK' && !String(formData.brand || '').trim()) {
    return 'Selecciona la marca de la mochila.';
  }

  if (formData.category === 'HEADSET') {
    if (!String(formData.brand || '').trim()) {
      return 'Selecciona la marca del audifono.';
    }
    if (!String(formData.connection || '').trim()) {
      return 'Selecciona la conexion del audifono.';
    }
    if (
      !Array.isArray(formData.supportedConnections) ||
      formData.supportedConnections.length === 0
    ) {
      return 'Selecciona al menos una conectividad soportada.';
    }
  }

  if (formData.category === 'MICROPHONE' && !String(formData.brand || '').trim()) {
    return 'Selecciona la marca del microfono.';
  }

  if (formData.category === 'SPEAKER' && !String(formData.brand || '').trim()) {
    return 'Selecciona la marca del parlante.';
  }

  if (['WEBCAM', 'CAPTURE_CARD', 'CABLE_HUB'].includes(formData.category)) {
    if (!String(formData.brand || '').trim()) {
      return 'Selecciona la marca del producto.';
    }
    if (
      (formData.category === 'WEBCAM' || formData.category === 'CAPTURE_CARD') &&
      !String(formData.resolution || '').trim()
    ) {
      return 'Selecciona la resolucion del producto.';
    }
    if (
      (formData.category === 'WEBCAM' || formData.category === 'CAPTURE_CARD') &&
      Number(formData.fps) <= 0
    ) {
      return 'Selecciona los FPS del producto.';
    }
    if (formData.category === 'CABLE_HUB' && !String(formData.cableHubType || '').trim()) {
      return 'Selecciona el tipo Cable o Hub.';
    }
    if (formData.category === 'CABLE_HUB' && formData.cableHubType === 'Cable') {
      if (!String(formData.cableType || '').trim()) {
        return 'Selecciona el tipo de cable.';
      }
      if (!String(formData.cableLengthMeters || '').trim()) {
        return 'Selecciona el largo del cable.';
      }
    }
    if (formData.category === 'CABLE_HUB' && formData.cableHubType === 'Hub') {
      if (!String(formData.hubInputType || '').trim()) {
        return 'Selecciona el tipo de entrada del hub.';
      }
      if (formData.hasHdmiOutput === undefined || formData.hasRj45Output === undefined) {
        return 'Selecciona las salidas HDMI y RJ45 del hub.';
      }
    }
  }

  return null;
}
