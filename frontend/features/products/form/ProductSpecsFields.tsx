'use client';

import type { ReactNode } from 'react';
import {
  FiBox,
  FiCpu,
  FiGrid,
  FiHardDrive,
  FiHeadphones,
  FiMonitor,
  FiWind,
  FiZap,
} from 'react-icons/fi';
import * as C from './productFormConfig';
import {
  BooleanField,
  MultiCheckField,
  NumberField,
  RadioField,
  SectionTitle,
  SelectField,
  TextField,
  useProductForm,
} from './ProductFormFields';

const unitLabels = (options: readonly string[], unit: string) =>
  Object.fromEntries(options.map((value) => [value, `${value}${unit}`]));

function BrandSelect({ options }: { options: readonly string[] }) {
  return (
    <SelectField
      name="brand"
      label="Marca"
      options={options}
      placeholder="Seleccionar marca"
      required
    />
  );
}

function getKeyboardSwitchPlaceholder(keyboardType: string) {
  switch (keyboardType) {
    case 'Mecanico':
      return 'Ej: Red, Blue, Brown, Silver';
    case 'Magnetico':
      return 'Ej: Magnetic HE, Hall Effect, Magnetic Jade';
    case 'Membrana':
      return 'Ej: Membrana, Rubber Dome, No aplica';
    case 'Optico':
      return 'Ej: Optical Red, Optical Blue';
    default:
      return 'Ej: Red, Blue, Magnetic HE';
  }
}

function CpuSpecs() {
  const { values } = useProductForm();
  return (
    <>
      <SelectField name="cpuBrand" label="Marca del procesador" options={C.CPU_BRANDS} />
      <SelectField
        name="socket"
        label="Socket"
        options={C.CPU_SOCKETS_BY_BRAND[values.cpuBrand] ?? []}
      />
      <NumberField
        name="baseTdpWatts"
        label="TDP base (Watts)"
        placeholder="Ej: 65"
        helper="Dato informativo del consumo base del procesador."
      />
      <NumberField
        name="tdp"
        label="TDP maximo (Watts)"
        placeholder="Ej: 105"
        required
        helper="Usado para validar fuente de poder y refrigeracion."
      />
      <NumberField name="cores" label="Nucleos" placeholder="Ej: 8" />
      <NumberField name="threads" label="Threads" placeholder="Ej: 16" />
      <TextField name="frequency" label="Frecuencia (GHz)" placeholder="Ej: 4.2" />
      <BooleanField name="integratedGraphics" label="Graficos integrados" />
      <BooleanField
        name="includesCooler"
        label="Incluye cooler"
        labels={{ false: 'No (Requiere comprar aparte)', true: 'Si (De stock)' }}
      />
    </>
  );
}

function MotherboardSpecs() {
  return (
    <>
      <BrandSelect options={C.MOTHERBOARD_BRANDS} />
      <SelectField name="socket" label="Socket" options={C.SOCKETS} />
      <SelectField name="formFactor" label="Formato" options={C.FORM_FACTORS} />
      <SelectField name="memoryType" label="Tipo de RAM" options={C.RAM_TYPES} />
      <SelectField
        name="memorySlots"
        label="Slots de RAM"
        options={['2', '4', '8']}
        labels={unitLabels(['2', '4', '8'], ' Slots')}
      />
      <SelectField
        name="m2Slots"
        label="Slots M.2"
        options={['1', '2', '3', '4']}
        labels={{ 1: '1 Slot', 2: '2 Slots', 3: '3 Slots', 4: '4 Slots' }}
      />
      <MultiCheckField
        name="supportedM2FormFactors"
        label="Tamaños M.2 soportados"
        options={C.M2_FORM_FACTORS}
        columns="md:grid-cols-5"
      />
    </>
  );
}

function RamSpecs() {
  return (
    <>
      <BrandSelect options={C.RAM_BRANDS} />
      <SelectField name="memoryType" label="Tipo de RAM" options={C.RAM_TYPES} />
      <SelectField
        name="capacity"
        label="Capacidad por modulo (GB)"
        options={C.RAM_CAPACITIES}
        labels={unitLabels(C.RAM_CAPACITIES, ' GB')}
      />
      <SelectField
        name="modules"
        label="Modulos"
        options={['1', '2', '4']}
        labels={{ 1: '1 Modulo (Single)', 2: '2 Modulos (Dual Kit)', 4: '4 Modulos (Quad Kit)' }}
      />
      <NumberField name="speed" label="Frecuencia (MHz)" placeholder="Ej: 6000" />
      <TextField name="latency" label="Latencia" placeholder="Ej: CL36" />
      <BooleanField name="hasRGB" label="Iluminacion RGB" />
    </>
  );
}

function GpuSpecs() {
  return (
    <>
      <SelectField
        name="brand"
        label="Marca ensambladora"
        options={C.GPU_BRANDS}
        placeholder="Seleccionar marca"
        required
      />
      <SelectField name="chipset" label="Chipset" options={C.GPU_CHIPSETS} />
      <SelectField
        name="vram"
        label="VRAM (GB)"
        options={C.GPU_VRAM_OPTIONS}
        labels={unitLabels(C.GPU_VRAM_OPTIONS, ' GB')}
        required
      />
      <SelectField name="typeVram" label="Tipo de VRAM" options={C.GPU_VRAM_TYPES} required />
      <NumberField
        name="length"
        label="Largo (mm)"
        placeholder="Ej: 320"
        required
        helper="Vital para validar con Case."
        helperTone="danger"
      />
      <NumberField
        name="gpuPowerWatts"
        label="TGP / Consumo real (Watts)"
        placeholder="Ej: 280"
        required
        helper="Usado por el armador para estimar el consumo del sistema."
        helperTone="danger"
      />
      <NumberField
        name="recommendedPsuWatts"
        label="PSU recomendada (Watts)"
        placeholder="Ej: 650"
        helper="Referencia del fabricante para la fuente minima sugerida."
      />
      <SelectField name="fans" label="Ventiladores" options={C.GPU_FAN_OPTIONS} />
    </>
  );
}

function PsuSpecs() {
  return (
    <>
      <BrandSelect options={C.PSU_BRANDS} />
      <SelectField
        name="wattage"
        label="Potencia (Watts)"
        options={C.PSU_WATT_OPTIONS}
        labels={unitLabels(C.PSU_WATT_OPTIONS, ' W')}
        placeholder="Seleccionar potencia"
        required
      />
      <SelectField name="certification" label="Certificacion" options={C.PSU_CERTS} />
      <SelectField name="modular" label="Modularidad" options={C.PSU_MODULAR_OPTIONS} />
      <SelectField
        name="formFactor"
        label="Formato"
        options={['ATX', 'SFX']}
        labels={{ ATX: 'ATX (Estandar)', SFX: 'SFX (Pequena)' }}
      />
    </>
  );
}

function CaseSpecs() {
  return (
    <>
      <BrandSelect options={C.CASE_BRANDS} />
      <MultiCheckField
        name="supportedFormFactors"
        label="Soporte de placa"
        options={C.FORM_FACTORS}
      />
      <NumberField name="maxGpuLength" label="Max Largo GPU (mm)" placeholder="Ej: 340" required />
      <BooleanField
        name="includesPsu"
        label="Incluye fuente"
        labels={{ false: 'No', true: 'Si (Generica)' }}
      />
      <MultiCheckField
        name="radiatorSupportMmValues"
        label="Soporte radiador líquido"
        options={C.CASE_RADIATOR_SUPPORT_OPTIONS.map((option) => option.value)}
        labels={C.CASE_RADIATOR_SUPPORT_LABELS}
      />
      <SelectField
        name="supportsTowerCooler"
        label="¿Soporta refrigeración de torre?"
        options={['false', 'true']}
        labels={{ false: 'No', true: 'Sí' }}
        placeholder="Seleccionar"
        required
      />
      <NumberField name="includedFans" label="Ventiladores Incluidos" placeholder="Ej: 3" />
    </>
  );
}

function CoolerSpecs() {
  const { values } = useProductForm();
  return (
    <>
      <BrandSelect options={C.COOLER_BRANDS} />
      <RadioField name="type" label="Tipo de Refrigeracion" options={C.COOLER_TYPES} />
      <MultiCheckField
        name="compatibleSockets"
        label="Sockets compatibles"
        options={C.COOLER_SOCKET_OPTIONS}
        columns="md:grid-cols-5"
      />
      <NumberField
        name="tdpCapacity"
        label="TDP soportado (Watts)"
        placeholder="Ej: 180"
        required
        helper="Debe ser igual o mayor al TDP del CPU."
      />
      {values.type === 'Líquida' && (
        <SelectField
          name="radiatorSize"
          label="Tamaño Radiador"
          options={C.COOLER_RADIATOR_OPTIONS}
          labels={unitLabels(C.COOLER_RADIATOR_OPTIONS, ' mm')}
          required
        />
      )}
      <BooleanField name="hasScreen" label="Tiene Pantalla LCD?" />
      <BooleanField name="hasRGB" label="RGB?" />
    </>
  );
}

function StorageSpecs() {
  const { values } = useProductForm();
  const isM2 = values.type === 'Sólido M.2';
  return (
    <>
      <SelectField name="type" label="Tipo" options={C.STORAGE_TYPES} />
      {isM2 && <SelectField name="interface" label="Generacion" options={C.NVME_GENS} />}
      <NumberField name="capacity" label="Capacidad (GB)" placeholder="Ej: 1000" required />
      <NumberField name="readSpeed" label="Velocidad Lectura (MB/s)" placeholder="Ej: 7000" />
      <NumberField name="writeSpeed" label="Velocidad Escritura (MB/s)" placeholder="Ej: 5000" />
      {isM2 && (
        <SelectField name="m2FormFactor" label="Tamaño fisico M.2" options={C.M2_FORM_FACTORS} />
      )}
    </>
  );
}

function ComputerSpecs() {
  const { values } = useProductForm();
  const isLaptop = values.category === 'LAPTOP';
  return (
    <>
      <SectionTitle>Hardware Principal</SectionTitle>
      {isLaptop && <BrandSelect options={C.LAPTOP_BRANDS} />}
      <TextField name="processor" label="Procesador" placeholder="Ej: Intel Core i7-13700H" />
      <SelectField
        name="ram"
        label="Memoria RAM"
        options={C.LAPTOP_RAM_OPTIONS}
        labels={C.LAPTOP_RAM_LABELS}
      />
      {isLaptop ? (
        <SelectField
          name="storage"
          label="Almacenamiento"
          options={C.LAPTOP_STORAGE_OPTIONS}
          labels={C.LAPTOP_STORAGE_LABELS}
        />
      ) : (
        <TextField name="storage" label="Almacenamiento" placeholder="Ej: 1TB NVMe" />
      )}
      <BooleanField
        name="hasDedicatedGpu"
        label="Tiene grafica dedicada"
        labels={{ false: 'No (Graficos Integrados)', true: 'Si' }}
      />
      {values.hasDedicatedGpu === 'true' && (
        <>
          <SelectField
            name="gpuBrand"
            label="Marca GPU"
            options={C.LAPTOP_GPU_BRANDS}
            placeholder="Seleccionar..."
          />
          <TextField name="gpuModel" label="Modelo GPU" placeholder="Ej: RTX 4060, RX 7600M" />
        </>
      )}
      {isLaptop ? (
        <>
          <SectionTitle>Pantalla</SectionTitle>
          <SelectField
            name="screenSize"
            label="Tamaño Pantalla"
            options={C.LAPTOP_SCREEN_OPTIONS}
            labels={unitLabels(C.LAPTOP_SCREEN_OPTIONS, '"')}
          />
          <SelectField
            name="refreshRate"
            label="Tasa Refresco (Hz)"
            options={C.LAPTOP_REFRESH_OPTIONS}
            labels={unitLabels(C.LAPTOP_REFRESH_OPTIONS, ' Hz')}
          />
          <SelectField name="panelType" label="Panel" options={C.PANEL_TYPES} />
          <BooleanField name="includesWindows" label="Incluye Windows de serie?" />
        </>
      ) : (
        <>
          <SectionTitle>Equipo pre-ensamblado</SectionTitle>
          <SelectField name="coolerType" label="Cooler incluido" options={C.DESKTOP_COOLER_TYPES} />
          <NumberField name="psuWatts" label="Fuente de poder (Watts)" placeholder="Ej: 650" />
          <TextField
            name="caseModel"
            label="Modelo del case"
            placeholder="Ej: MSI Gungnir 110M"
            wide
          />
        </>
      )}
    </>
  );
}

function SoftwareSpecs() {
  return (
    <>
      <SelectField name="licenseType" label="Tipo de Licencia" options={C.SOFTWARE_LICENSE_TYPES} />
      <SelectField name="platform" label="Plataforma" options={C.SOFTWARE_PLATFORMS} />
    </>
  );
}

function LaptopAccessorySpecs() {
  const { values } = useProductForm();
  const isCoolingBase = values.category === 'LAPTOP_COOLING_BASE';
  return (
    <>
      <SectionTitle>Accesorio para portatil</SectionTitle>
      <BrandSelect options={isCoolingBase ? C.LAPTOP_COOLING_BASE_BRANDS : C.BACKPACK_BRANDS} />
      <SelectField
        name="supportedLaptopSize"
        label="Tamaño laptop soportado"
        options={C.LAPTOP_SUPPORTED_SIZE_OPTIONS}
      />
      <SelectField
        name="color"
        label="Color"
        options={C.ACCESSORY_COLOR_OPTIONS}
        placeholder="Seleccionar color"
      />
      {isCoolingBase && (
        <>
          <SelectField
            name="fanCount"
            label="Cantidad de ventiladores"
            options={C.LAPTOP_COOLING_BASE_FAN_COUNTS}
          />
          <BooleanField name="hasRGB" label="RGB" />
          <SelectField
            name="connectivity"
            label="Conectividad"
            options={C.LAPTOP_ACCESSORY_CONNECTIVITY}
          />
        </>
      )}
    </>
  );
}

function MonitorSpecs() {
  return (
    <>
      <BrandSelect options={C.MONITOR_BRANDS} />
      <TextField name="screenSize" label="Tamaño (Pulgadas)" placeholder="Ej: 27" />
      <SelectField name="resolution" label="Resolución" options={C.MONITOR_RESOLUTION_OPTIONS} />
      <SelectField name="panelType" label="Panel" options={C.PANEL_TYPES} />
      <SelectField
        name="refreshRate"
        label="Tasa de refresco (Hz)"
        options={C.MONITOR_REFRESH_OPTIONS}
        labels={unitLabels(C.MONITOR_REFRESH_OPTIONS, ' Hz')}
      />
      <NumberField
        name="responseTimeMs"
        label="Tiempo de respuesta (ms)"
        step="0.1"
        placeholder="Ej: 1"
      />
      <BooleanField name="hasSpeakers" label="¿Tiene parlantes integrados?" />
      <MultiCheckField name="ports" label="Puertos disponibles" options={C.MONITOR_PORTS} />
    </>
  );
}

function KeyboardSpecs() {
  const { values } = useProductForm();
  return (
    <>
      <BrandSelect options={C.KEYBOARD_BRANDS} />
      <SelectField name="keyboardType" label="Tipo de teclado" options={C.KEYBOARD_TYPES} />
      <MultiCheckField
        name="connections"
        label="Conectividad"
        options={C.PERIPHERAL_CONNECTIONS}
        columns="md:grid-cols-3"
      />
      <SelectField name="layoutLanguage" label="Idioma / Layout" options={C.LAYOUT_LANGUAGES} />
      <SelectField
        name="keyboardFormFactor"
        label="Formato de teclado"
        options={C.KEYBOARD_FORM_FACTORS}
      />
      {values.keyboardType === 'Hibrido' && <BooleanField name="hasLighting" label="RGB" />}
      <TextField
        name="switchType"
        label="Tipo de switch"
        placeholder={getKeyboardSwitchPlaceholder(values.keyboardType)}
      />
    </>
  );
}

function MouseSpecs() {
  const { values } = useProductForm();
  return (
    <>
      <BrandSelect options={C.MOUSE_BRANDS} />
      <SelectField name="mouseType" label="Tipo de mouse" options={C.MOUSE_TYPES} />
      <MultiCheckField
        name="connections"
        label="Tipo de conexion"
        options={C.MOUSE_CONNECTIONS}
        columns="md:grid-cols-3"
      />
      {values.mouseType === 'Gamer' && (
        <>
          <NumberField name="buttonCount" label="Cantidad de botones" placeholder="Ej: 6" />
          <NumberField name="dpi" label="DPI maximo" placeholder="Ej: 26000" />
          <SelectField
            name="pollingRateHz"
            label="Polling Rate"
            options={C.POLLING_RATES}
            labels={unitLabels(C.POLLING_RATES, ' Hz')}
          />
        </>
      )}
      <SelectField name="powerType" label="Usa bateria o pila?" options={C.MOUSE_POWER_TYPES} />
      <NumberField name="weightGrams" label="Peso (g)" placeholder="Ej: 63" />
    </>
  );
}

function MousepadSpecs() {
  return (
    <>
      <BrandSelect options={C.MOUSEPAD_BRANDS} />
      <NumberField name="widthCm" label="Ancho (cm)" placeholder="Ej: 90" />
      <NumberField name="lengthCm" label="Largo (cm)" placeholder="Ej: 40" />
      <BooleanField name="hasLed" label="Tiene LEDs" />
    </>
  );
}

function VideoCaptureSpecs() {
  const { values } = useProductForm();
  const isWebcam = values.category === 'WEBCAM';
  const fpsOptions = isWebcam ? C.WEBCAM_FPS_OPTIONS : C.CAPTURE_CARD_FPS_OPTIONS;
  return (
    <>
      <BrandSelect options={isWebcam ? C.WEBCAM_BRANDS : C.CAPTURE_CARD_BRANDS} />
      <SelectField name="resolution" label="Resolucion" options={C.VIDEO_RESOLUTION_OPTIONS} />
      <SelectField
        name="fps"
        label="FPS"
        options={fpsOptions}
        labels={unitLabels(fpsOptions, ' FPS')}
      />
    </>
  );
}

function CableHubSpecs() {
  const { values } = useProductForm();
  return (
    <>
      <BrandSelect options={C.CABLE_HUB_BRANDS} />
      <SelectField name="cableHubType" label="Tipo" options={C.CABLE_HUB_TYPES} />
      {values.cableHubType === 'Cable' && (
        <>
          <SelectField name="cableType" label="Tipo de cable" options={C.CABLE_TYPES} />
          <SelectField
            name="cableLengthMeters"
            label="Largo en metros"
            options={C.CABLE_LENGTHS}
            labels={unitLabels(C.CABLE_LENGTHS, ' m')}
          />
        </>
      )}
      {values.cableHubType === 'Hub' && (
        <>
          <SelectField name="hubInputType" label="Tipo de entrada" options={C.HUB_INPUT_TYPES} />
          <BooleanField name="hasHdmiOutput" label="Salida HDMI" />
          <BooleanField name="hasRj45Output" label="Salida RJ45" />
        </>
      )}
    </>
  );
}

function ChairSpecs() {
  return (
    <>
      <TextField name="brand" label="Marca" />
      <TextField name="color" label="Color" placeholder="Ej: Negro/Rojo" />
      <SelectField name="material" label="Material" options={C.CHAIR_MATERIALS} />
      <NumberField name="maxWeightKg" label="Peso maximo soportado (kg)" placeholder="Ej: 120" />
    </>
  );
}

function GamingDeskSpecs() {
  return (
    <>
      <TextField name="brand" label="Marca" />
      <TextField name="color" label="Color" />
      <TextField name="surface" label="Superficie" placeholder="Ej: Carbono, madera, melamina" />
      <NumberField name="weightKg" label="Peso (kg)" placeholder="Ej: 25" />
    </>
  );
}

function HeadsetSpecs() {
  const { values } = useProductForm();
  return (
    <>
      <BrandSelect options={C.HEADSET_BRANDS} />
      <SelectField name="audioType" label="Tipo de audio" options={C.HEADSET_AUDIO_TYPES} />
      <SelectField name="connection" label="Conectividad" options={C.AUDIO_CONNECTIVITY_OPTIONS} />
      <MultiCheckField
        name="supportedConnections"
        label="Tipo de conexion"
        options={
          values.connection === 'Cableado'
            ? C.HEADSET_WIRED_CONNECTIONS
            : C.HEADSET_WIRELESS_CONNECTIONS
        }
        columns="md:grid-cols-3"
      />
      <NumberField name="driverSize" label="Drivers (mm)" placeholder="Ej: 50" />
      <NumberField name="impedance" label="Impedancia (Ohms)" placeholder="Ej: 32" />
      <SelectField name="micType" label="Microfono" options={C.HEADSET_MIC_TYPES} />
      <BooleanField name="micIntegrated" label="Microfono integrado" />
      <BooleanField name="micRemovable" label="Microfono removible" />
      <BooleanField
        name="noiseCancel"
        label="Cancelacion de ruido"
        labels={{ false: 'No', true: 'Si (ANC)' }}
      />
      <SelectField
        name="surroundSound"
        label="Sonido surround"
        options={C.HEADSET_SURROUND_OPTIONS}
      />
      <BooleanField name="consoleCompatible" label="Compatible consola" />
      <BooleanField name="hasRGB" label="RGB?" />
      <TextField name="color" label="Color" placeholder="Ej: Negro/Rojo" />
    </>
  );
}

function MicrophoneSpecs() {
  return (
    <>
      <BrandSelect options={C.MICROPHONE_BRANDS} />
      <SelectField name="microphoneType" label="Tipo de microfono" options={C.MICROPHONE_TYPES} />
      <SelectField name="connection" label="Conectividad" options={C.AUDIO_CONNECTIVITY_OPTIONS} />
      <MultiCheckField
        name="connectionTypes"
        label="Tipo de conexion"
        options={C.AUDIO_CONNECTION_TYPE_OPTIONS}
      />
      <SelectField name="micType" label="Patron polar" options={C.POLAR_PATTERN_OPTIONS} />
      <TextField
        name="frequencyResponse"
        label="Frecuencia de respuesta"
        placeholder="Ej: 20Hz-20kHz"
      />
      <BooleanField name="includesArm" label="Incluye brazo" />
      <BooleanField name="includesPopFilter" label="Incluye filtro pop" />
      <BooleanField name="hasRGB" label="RGB?" />
      <TextField name="color" label="Color" placeholder="Ej: Negro" />
    </>
  );
}

function SpeakerSpecs() {
  return (
    <>
      <BrandSelect options={C.SPEAKER_BRANDS} />
      <SelectField name="speakerType" label="Tipo de parlante" options={C.SPEAKER_TYPES} />
      <SelectField name="channels" label="Canales" options={C.SPEAKER_CHANNELS} />
      <SelectField name="connection" label="Conectividad" options={C.AUDIO_CONNECTIVITY_OPTIONS} />
      <MultiCheckField
        name="connectionTypes"
        label="Tipo de conexion"
        options={C.AUDIO_CONNECTION_TYPE_OPTIONS}
      />
      <NumberField name="wattage" label="Potencia (Watts)" placeholder="Ej: 20" />
      <BooleanField name="hasSubwoofer" label="Subwoofer" />
      <BooleanField name="remoteControl" label="Control remoto" />
      <BooleanField name="hasRGB" label="RGB?" />
      <TextField name="color" label="Color" placeholder="Ej: Negro" />
    </>
  );
}

function PowerProtectionSpecs() {
  return (
    <>
      <BrandSelect options={C.POWER_PROTECTION_BRANDS} />
      <SelectField name="outletType" label="Entradas" options={C.POWER_PROTECTION_OUTLET_TYPES} />
      <NumberField name="wattage" label="Watts que soporta" placeholder="Ej: 600" required />
    </>
  );
}

type SpecSection = { title: string; icon: ReactNode; Fields: () => ReactNode };

const SPEC_SECTIONS: Record<string, SpecSection> = {
  CPU: { title: 'Datos de Procesador', icon: <FiCpu />, Fields: CpuSpecs },
  MOTHERBOARD: { title: 'Datos de Placa', icon: <FiGrid />, Fields: MotherboardSpecs },
  RAM: { title: 'Datos de Memoria', icon: <FiZap />, Fields: RamSpecs },
  GPU: { title: 'Datos de Video', icon: <FiMonitor />, Fields: GpuSpecs },
  PSU: { title: 'Datos de Fuente', icon: <FiZap />, Fields: PsuSpecs },
  CASE: { title: 'Datos de Gabinete', icon: <FiBox />, Fields: CaseSpecs },
  COOLER: { title: 'Datos de Refrigeracion', icon: <FiWind />, Fields: CoolerSpecs },
  STORAGE: { title: 'Datos de Almacenamiento', icon: <FiHardDrive />, Fields: StorageSpecs },
  LAPTOP: { title: 'Datos de Laptop', icon: <FiMonitor />, Fields: ComputerSpecs },
  PC_DESKTOP: { title: 'Datos de PC', icon: <FiCpu />, Fields: ComputerSpecs },
  SOFTWARE: { title: 'Datos de Licencia', icon: <FiGrid />, Fields: SoftwareSpecs },
  LAPTOP_COOLING_BASE: {
    title: 'Datos de Base refrigeradora',
    icon: <FiWind />,
    Fields: LaptopAccessorySpecs,
  },
  BACKPACK: { title: 'Datos de Mochila', icon: <FiBox />, Fields: LaptopAccessorySpecs },
  MONITOR: { title: 'Datos de Monitor', icon: <FiMonitor />, Fields: MonitorSpecs },
  KEYBOARD: { title: 'Datos de Teclado', icon: <FiGrid />, Fields: KeyboardSpecs },
  MOUSE: { title: 'Datos de Mouse', icon: <FiGrid />, Fields: MouseSpecs },
  MOUSEPAD: { title: 'Datos de Mousepad', icon: <FiGrid />, Fields: MousepadSpecs },
  WEBCAM: { title: 'Datos de Webcam', icon: <FiMonitor />, Fields: VideoCaptureSpecs },
  CAPTURE_CARD: { title: 'Datos de Capturadora', icon: <FiMonitor />, Fields: VideoCaptureSpecs },
  CABLE_HUB: { title: 'Datos de Cables y Hub', icon: <FiZap />, Fields: CableHubSpecs },
  CHAIR: { title: 'Datos de Silla Gamer', icon: <FiBox />, Fields: ChairSpecs },
  GAMING_DESK: { title: 'Datos de Mesa Gamer', icon: <FiBox />, Fields: GamingDeskSpecs },
  HEADSET: { title: 'Datos de Audifonos', icon: <FiHeadphones />, Fields: HeadsetSpecs },
  MICROPHONE: { title: 'Datos de Microfono', icon: <FiHeadphones />, Fields: MicrophoneSpecs },
  SPEAKER: { title: 'Datos de Parlantes', icon: <FiHeadphones />, Fields: SpeakerSpecs },
  UPS: { title: 'Datos de UPS', icon: <FiZap />, Fields: PowerProtectionSpecs },
  STABILIZER: { title: 'Datos de Estabilizador', icon: <FiZap />, Fields: PowerProtectionSpecs },
};

export default function ProductSpecsFields() {
  const { values } = useProductForm();
  const section = SPEC_SECTIONS[values.category];
  if (!section) {
    return (
      <p className="col-span-2 text-sm text-gray-500">
        {values.category
          ? 'Esta categoria no tiene especificaciones adicionales.'
          : 'Selecciona una categoria para ver sus especificaciones.'}
      </p>
    );
  }
  const { title, icon, Fields } = section;
  return (
    <>
      <div className="col-span-2 flex items-center gap-2 border-b border-blue-200 pb-2 font-bold text-blue-800">
        {icon} {title}
      </div>
      <Fields />
    </>
  );
}
