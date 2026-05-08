type ProductFormState = Record<string, any>;

type ValidateProductFormOptions = {
  mode?: 'create' | 'edit';
  imageCount?: number;
  requireImages?: boolean;
  nonNegativeFields?: Set<string>;
  noNegativeTextFields?: Set<string>;
  nameRegex?: RegExp;
  descriptionRegex?: RegExp;
  buildPayload?: (formData: ProductFormState, options?: { mode?: 'create' | 'edit' }) => ProductFormState;
  cpuSocketsByBrand?: Record<string, string[]>;
};

export function validateProductForm(formData: ProductFormState, options: ValidateProductFormOptions = {}) {
  const trimmedName = String(formData.name || '').trim();
  const trimmedDescription = String(formData.description || '').trim();

  if (options.nameRegex && !options.nameRegex.test(trimmedName)) {
    return 'El nombre debe tener entre 10 y 120 caracteres y solo usar letras, numeros y signos comunes.';
  }

  if (options.descriptionRegex && !options.descriptionRegex.test(trimmedDescription)) {
    return 'La descripcion debe tener entre 20 y 1200 caracteres y solo usar texto valido.';
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

  if (formData.category === 'COOLER') {
    if (!Array.isArray(formData.compatibleSockets) || formData.compatibleSockets.length === 0) {
      return 'Selecciona al menos un socket compatible para el cooler.';
    }
    if (Number(formData.tdpCapacity) <= 0) {
      return 'El TDP soportado del cooler debe ser mayor a 0.';
    }
  }

  if (formData.category === 'STORAGE') {
    const isM2 = String(formData.type || '').includes('M.2') || String(formData.type || '').toUpperCase().includes('NVME');
    if (isM2 && !formData.m2FormFactor) {
      return 'Selecciona el tamano fisico M.2 del almacenamiento.';
    }
  }

  if (formData.category === 'PC_DESKTOP' && formData.psuWatts !== '' && Number(formData.psuWatts) < 100) {
    return 'La fuente de poder debe ser un numero positivo. Recomendado minimo 100W.';
  }

  if (formData.category === 'MONITOR' && formData.responseTimeMs !== '' && Number(formData.responseTimeMs) < 0.1) {
    return 'El tiempo de respuesta debe ser un numero positivo mayor o igual a 0.1 ms.';
  }

  if (formData.category === 'KEYBOARD' && Array.isArray(formData.connections) && formData.connections.length === 0) {
    return 'Selecciona al menos una conexion para el teclado.';
  }

  if (formData.category === 'MOUSE' && Array.isArray(formData.connections) && formData.connections.length === 0) {
    return 'Selecciona al menos una conexion para el mouse.';
  }

  return null;
}
