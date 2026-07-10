import { Transform } from 'class-transformer';
import {
  IsBoolean,
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalNumber,
  toOptionalStringArray,
  toTrimmedString,
} from '../../common/dto/transformers';

function toKeyboardLayout({ value }: { value: unknown }) {
  if (value === undefined || value === null) {
    return value;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return undefined;
  }

  if (
    normalized === 'EspaÃ±ol' ||
    normalized === 'Espa?ol' ||
    normalized.toLowerCase() === 'espanol'
  ) {
    return 'Español';
  }

  return normalized;
}

const NAME_REGEX = /^[\p{L}\p{N}\s.,+\-_%/()[\]:;'"#&°@]{5,200}$/u;
const PRODUCT_NAME_MESSAGE =
  'El nombre debe tener entre 5 y 200 caracteres y puede incluir caracteres técnicos comunes.';
const SKU_REGEX = /^[A-Z0-9_-]+$/;

function toNormalizedSku({ value }: { value: unknown }) {
  if (value === undefined || value === null) {
    return value;
  }

  return String(value).trim().toUpperCase();
}

export const PRODUCT_CATEGORIES = [
  'CPU',
  'MOTHERBOARD',
  'RAM',
  'GPU',
  'PSU',
  'CASE',
  'COOLER',
  'STORAGE',
  'LAPTOP',
  'PC_DESKTOP',
  'SOFTWARE',
  'MONITOR',
  'KEYBOARD',
  'MOUSE',
  'MOUSEPAD',
  'CHAIR',
  'GAMING_DESK',
  'HEADSET',
  'MICROPHONE',
  'SPEAKER',
  'WEBCAM',
  'CAPTURE_CARD',
  'CABLE_HUB',
  'LAPTOP_COOLING_BASE',
  'BACKPACK',
] as const;

export class CreateProductDto {
  @Transform(toNormalizedSku)
  @IsString({ message: 'El SKU es obligatorio.' })
  @IsNotEmpty({ message: 'El SKU es obligatorio.' })
  @Length(3, 80, { message: 'El SKU debe tener entre 3 y 80 caracteres.' })
  @Matches(SKU_REGEX, {
    message: 'El SKU solo puede contener letras, números, guiones y guion bajo.',
  })
  sku!: string;

  @Transform(toTrimmedString)
  @IsString()
  @Length(5, 200, { message: PRODUCT_NAME_MESSAGE })
  @Matches(NAME_REGEX, { message: PRODUCT_NAME_MESSAGE })
  name!: string;

  @Transform(toTrimmedString)
  @IsString()
  @Length(10, 200, {
    message: 'La descripción debe tener entre 10 y 200 caracteres.',
  })
  description!: string;

  @Transform(toOptionalNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price!: number;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isOnSale?: boolean;

  @IsOptional()
  salePrice?: number | null;

  @Transform(toOptionalNumber)
  @IsInt()
  @Min(0)
  stock!: number;

  @Transform(toTrimmedString)
  @IsString()
  @IsIn(PRODUCT_CATEGORIES)
  category!: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  images?: string[];

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @IsIn(['Intel', 'AMD'])
  cpuBrand?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  socket?: string;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  cores?: number;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  threads?: number;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  frequency?: string;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  baseTdpWatts?: number;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  tdp?: number;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  integratedGraphics?: boolean;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  includesCooler?: boolean;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  memorySlots?: number;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  m2Slots?: number;

  @Transform(toOptionalStringArray)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedM2FormFactors?: string[];

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  formFactor?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  memoryType?: string;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  speed?: number;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  modules?: number;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  hasRGB?: boolean;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  latency?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  chipset?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  typeVram?: string;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  gpuPowerWatts?: number;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  recommendedPsuWatts?: number;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  vram?: number;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  length?: number;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  fans?: number;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  wattage?: number;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  certification?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modular?: string;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  maxGpuLength?: number;

  @Transform(toOptionalStringArray)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedFormFactors?: string[];

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  includesPsu?: boolean;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  supportsTowerCooler?: boolean;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  includedFans?: number;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  radiatorSupportMm?: number;

  @Transform(toOptionalStringArray)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  radiatorSupportMmValues?: string[];

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  fanCount?: number;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  radiatorSize?: number;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  hasScreen?: boolean;

  @Transform(toOptionalStringArray)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  compatibleSockets?: string[];

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  tdpCapacity?: number;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  interface?: string;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  readSpeed?: number;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  writeSpeed?: number;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @IsIn(['2230', '2242', '2260', '2280', '22110'])
  m2FormFactor?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  screenSize?: string;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  refreshRate?: number;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  panelType?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  resolution?: string;

  @ValidateIf((product) => product.category === 'WEBCAM' || product.category === 'CAPTURE_CARD')
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @IsIn([30, 60, 120])
  fps?: number;

  @ValidateIf((product) => product.category === 'CABLE_HUB')
  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @IsIn(['Cable', 'Hub'])
  cableHubType?: string;

  @ValidateIf((product) => product.category === 'LAPTOP_COOLING_BASE')
  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @IsIn(['USB-A', 'USB-C'])
  connectivity?: string;

  @ValidateIf(
    (product) => product.category === 'LAPTOP_COOLING_BASE' || product.category === 'BACKPACK',
  )
  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  supportedLaptopSize?: string;

  @ValidateIf((product) => product.category === 'CABLE_HUB')
  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @IsIn([
    'HDMI a HDMI',
    'DisplayPort a DisplayPort',
    'Tipo C a HDMI',
    'Tipo C a DisplayPort',
    'Tipo C a Tipo C',
  ])
  cableType?: string;

  @ValidateIf((product) => product.category === 'CABLE_HUB')
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @IsIn([1, 2, 3])
  cableLengthMeters?: number;

  @ValidateIf((product) => product.category === 'CABLE_HUB')
  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @IsIn(['USB-C', 'USB-A'])
  hubInputType?: string;

  @ValidateIf((product) => product.category === 'CABLE_HUB')
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  hasHdmiOutput?: boolean;

  @ValidateIf((product) => product.category === 'CABLE_HUB')
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  hasRj45Output?: boolean;

  @ValidateIf((product) => product.category === 'HEADSET')
  @Transform(toOptionalStringArray)
  @IsOptional()
  @IsArray()
  @IsIn(
    [
      'Cable USB',
      'USB',
      'USB-C',
      'Jack 3.5 mm',
      'Jack 3.5mm',
      'USB Dongle 2.4 GHz',
      'Bluetooth',
      '2.4 GHz',
    ],
    {
      each: true,
    },
  )
  supportedConnections?: string[];

  @ValidateIf((product) => product.category === 'MONITOR')
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  responseTimeMs?: number;

  @Transform(toOptionalStringArray)
  @IsOptional()
  @IsArray()
  @IsIn(['VGA', 'HDMI', 'DisplayPort', 'USB-C'], { each: true })
  ports?: string[];

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  hasSpeakers?: boolean;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  processor?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ram?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  storage?: string;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  hasDedicatedGpu?: boolean;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  includesWindows?: boolean;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  gpuBrand?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  gpuModel?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @IsIn([
    'De serie',
    'Torre',
    'Aire (Torre)',
    'Líquida',
    'Liquida',
    'Liquida (AIO)',
    'No incluye',
    'No especificado',
  ])
  coolerType?: string;

  @ValidateIf((product) => product.category === 'PC_DESKTOP')
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  psuWatts?: number;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  caseModel?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @IsIn(['Membrana', 'Semi-mecanico', 'Mecanico', 'Magnetico', 'Optico', 'Hibrido'])
  keyboardType?: string;

  @Transform(toOptionalStringArray)
  @IsOptional()
  @IsArray()
  @IsIn(['Cableado', 'Bluetooth', 'Dongle USB', 'Inalambrico', '2.4 GHz'], { each: true })
  connections?: string[];

  @Transform(toKeyboardLayout)
  @IsOptional()
  @IsString()
  @IsIn(['Español', 'Ingles'])
  layoutLanguage?: string;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  hasLighting?: boolean;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  keyboardFormFactor?: string;

  @ValidateIf((product) => product.category === 'MOUSE')
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  weightGrams?: number;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @IsIn(['Oficina', 'Gamer'])
  mouseType?: string;

  @ValidateIf((product) => product.category === 'MOUSE' && product.mouseType === 'Gamer')
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  buttonCount?: number;

  @ValidateIf((product) => product.category === 'MOUSE' && product.mouseType === 'Gamer')
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @IsIn([1000, 2000, 4000, 8000])
  pollingRateHz?: number;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @IsIn(['Pila', 'Bateria', 'Ninguno'])
  powerType?: string;

  @ValidateIf((product) => product.category === 'MOUSEPAD')
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  widthCm?: number;

  @ValidateIf((product) => product.category === 'MOUSEPAD')
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  lengthCm?: number;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  hasLed?: boolean;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  color?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  material?: string;

  @ValidateIf((product) => product.category === 'CHAIR')
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  maxWeightKg?: number;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  surface?: string;

  @ValidateIf((product) => product.category === 'GAMING_DESK')
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  weightKg?: number;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  switchType?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  layout?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  connection?: string;

  @ValidateIf((product) => product.category === 'MOUSE' && product.mouseType === 'Gamer')
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  dpi?: number;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sensor?: string;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  wireless?: boolean;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  licenseType?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  platform?: string;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  driverSize?: number;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  impedance?: number;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  micType?: string;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  noiseCancel?: boolean;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  audioType?: string;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  micIntegrated?: boolean;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  micRemovable?: boolean;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  surroundSound?: string;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  consoleCompatible?: boolean;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  microphoneType?: string;

  @Transform(toOptionalStringArray)
  @IsOptional()
  @IsArray()
  connectionTypes?: string[];

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  frequencyResponse?: string;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  includesArm?: boolean;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  includesPopFilter?: boolean;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  speakerType?: string;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  channels?: string;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  hasSubwoofer?: boolean;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  remoteControl?: boolean;
}
