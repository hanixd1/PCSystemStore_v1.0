'use client';

import type { ChangeEventHandler } from 'react';

export type ComponentSpecArrayField =
  | 'supportedM2FormFactors'
  | 'supportedFormFactors'
  | 'radiatorSupportMmValues'
  | 'compatibleSockets';

type ComponentSpecValues = Partial<
  Record<
    | 'cpuBrand'
    | 'socket'
    | 'baseTdpWatts'
    | 'tdp'
    | 'cores'
    | 'threads'
    | 'frequency'
    | 'integratedGraphics'
    | 'includesCooler'
    | 'brand'
    | 'formFactor'
    | 'memoryType'
    | 'memorySlots'
    | 'm2Slots'
    | 'capacity'
    | 'modules'
    | 'speed'
    | 'latency'
    | 'hasRGB'
    | 'chipset'
    | 'vram'
    | 'typeVram'
    | 'length'
    | 'gpuPowerWatts'
    | 'recommendedPsuWatts'
    | 'fans'
    | 'wattage'
    | 'certification'
    | 'modular'
    | 'maxGpuLength'
    | 'includesPsu'
    | 'supportsTowerCooler'
    | 'includedFans'
    | 'type'
    | 'tdpCapacity'
    | 'radiatorSize'
    | 'hasScreen'
    | 'interface'
    | 'readSpeed'
    | 'writeSpeed'
    | 'm2FormFactor',
    string
  >
> &
  Partial<Record<ComponentSpecArrayField, string[]>>;

type SpecsMode = 'create' | 'edit';
type SpecsChangeHandler = ChangeEventHandler<HTMLInputElement | HTMLSelectElement>;

type SharedSpecsProps = {
  mode: SpecsMode;
  values: ComponentSpecValues;
  onChange: SpecsChangeHandler;
  fieldId: (name: string) => string;
};

type MultiValueProps = {
  onToggle: (field: ComponentSpecArrayField, value: string) => void;
  optionId: (field: string, value: string) => string;
};

type FieldProps = {
  mode: SpecsMode;
  name: string;
  label: string;
  value?: string;
  onChange: SpecsChangeHandler;
  fieldId: (name: string) => string;
  required?: boolean;
  placeholder?: string;
  helper?: string;
  helperTone?: 'muted' | 'danger';
};

function labelClass(mode: SpecsMode) {
  return mode === 'create'
    ? 'mb-2 block text-xs font-extrabold uppercase tracking-wide text-gray-500'
    : 'mb-2 block text-sm font-bold text-gray-700';
}

function inputClass(mode: SpecsMode) {
  return mode === 'create'
    ? 'w-full rounded-xl border border-gray-200 bg-white p-3 font-medium text-gray-800 outline-none transition focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20'
    : 'w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-brand-cyan';
}

function helperClass(mode: SpecsMode, tone: 'muted' | 'danger' = 'muted') {
  const color = tone === 'danger' ? 'text-red-500' : 'text-gray-500';
  return mode === 'create' ? `text-xs ${color}` : `mt-1 block text-xs ${color}`;
}

function TextField({
  mode,
  name,
  label,
  value = '',
  onChange,
  fieldId,
  required,
  placeholder,
  helper,
  helperTone,
}: FieldProps) {
  const id = fieldId(mode === 'create' ? name : label);
  return (
    <div>
      <label htmlFor={id} className={labelClass(mode)}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        className={inputClass(mode)}
        placeholder={placeholder}
        required={required}
      />
      {helper && <span className={helperClass(mode, helperTone)}>{helper}</span>}
    </div>
  );
}

function NumberField(props: FieldProps) {
  const { mode, name, label, value = '', onChange, fieldId, required, placeholder, helper } = props;
  const id = fieldId(mode === 'create' ? name : label);
  return (
    <div>
      <label htmlFor={id} className={labelClass(mode)}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="number"
        min={mode === 'edit' ? '0' : undefined}
        value={value}
        onChange={onChange}
        className={inputClass(mode)}
        placeholder={placeholder}
        required={required}
      />
      {helper && <span className={helperClass(mode, props.helperTone)}>{helper}</span>}
    </div>
  );
}

function SelectField({
  mode,
  name,
  label,
  value = '',
  onChange,
  fieldId,
  options,
  labels = {},
  required,
  placeholder,
}: FieldProps & {
  options: Array<string | number>;
  labels?: Record<string, string>;
}) {
  const id = fieldId(mode === 'create' ? name : label);
  return (
    <div>
      <label htmlFor={id} className={labelClass(mode)}>
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        className={inputClass(mode)}
        required={required}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((rawOption) => {
          const option = String(rawOption);
          return (
            <option key={option} value={option}>
              {labels[option] ?? option}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function MultiCheckField({
  mode,
  name,
  label,
  options,
  values = [],
  labels = {},
  onToggle,
  optionId,
  fieldId,
  createColumns = 'md:grid-cols-5',
}: {
  mode: SpecsMode;
  name: ComponentSpecArrayField;
  label: string;
  options: string[];
  values?: string[];
  labels?: Record<string, string>;
  onToggle: MultiValueProps['onToggle'];
  optionId: MultiValueProps['optionId'];
  fieldId: (name: string) => string;
  createColumns?: string;
}) {
  return (
    <fieldset className="col-span-2">
      <legend className={labelClass(mode)}>{label}</legend>
      <div
        className={`grid grid-cols-2 gap-2 ${mode === 'create' ? createColumns : 'md:grid-cols-5'}`}
      >
        {options.map((option) => {
          const optionGroup = mode === 'create' ? name : fieldId(label);
          const id = optionId(optionGroup, option);
          const checked = values.includes(option);
          return (
            <label
              htmlFor={id}
              key={option}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-semibold transition ${
                checked
                  ? 'border-brand-cyan bg-cyan-50 text-gray-950'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-brand-cyan hover:bg-cyan-50/50'
              }`}
            >
              <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(name, option)}
                className="h-4 w-4 rounded border-gray-300 text-brand-cyan focus:ring-brand-cyan"
              />
              <span>{labels[option] ?? option}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function RadioField({
  name,
  label,
  value,
  options,
  onChange,
  optionId,
}: {
  name: string;
  label: string;
  value?: string;
  options: string[];
  onChange: SpecsChangeHandler;
  optionId: MultiValueProps['optionId'];
}) {
  return (
    <fieldset className="col-span-2">
      <legend className="label-admin">{label}</legend>
      <div className="mt-2 flex gap-4">
        {options.map((option) => {
          const id = optionId(name, option);
          return (
            <label
              htmlFor={id}
              key={option}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border p-3 hover:bg-blue-50"
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={option}
                checked={value === option}
                onChange={onChange}
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const BOOLEAN_OPTIONS = ['false', 'true'];
const BOOLEAN_LABELS = { false: 'No', true: 'Si' };

export function CpuSpecsFields({
  mode,
  values,
  onChange,
  fieldId,
  cpuBrands,
  socketsByBrand,
}: SharedSpecsProps & {
  cpuBrands: string[];
  socketsByBrand: Record<string, string[]>;
}) {
  return (
    <>
      <SelectField
        mode={mode}
        name="cpuBrand"
        label="Marca del procesador"
        value={values.cpuBrand}
        onChange={onChange}
        fieldId={fieldId}
        options={cpuBrands}
      />
      <SelectField
        mode={mode}
        name="socket"
        label="Socket"
        value={values.socket}
        onChange={onChange}
        fieldId={fieldId}
        options={socketsByBrand[values.cpuBrand ?? ''] ?? []}
      />
      <NumberField
        mode={mode}
        name="baseTdpWatts"
        label="TDP base (Watts)"
        value={values.baseTdpWatts}
        onChange={onChange}
        fieldId={fieldId}
        placeholder={mode === 'create' ? 'Ej: 65' : undefined}
        helper={mode === 'create' ? 'Dato informativo del consumo base del procesador.' : undefined}
      />
      <NumberField
        mode={mode}
        name="tdp"
        label="TDP maximo (Watts)"
        value={values.tdp}
        onChange={onChange}
        fieldId={fieldId}
        placeholder={mode === 'create' ? 'Ej: 105' : undefined}
        required={mode === 'create'}
        helper={
          mode === 'create' ? 'Usado para validar fuente de poder y refrigeracion.' : undefined
        }
      />
      <NumberField
        mode={mode}
        name="cores"
        label="Nucleos"
        value={values.cores}
        onChange={onChange}
        fieldId={fieldId}
        placeholder={mode === 'create' ? 'Ej: 8' : undefined}
      />
      <NumberField
        mode={mode}
        name="threads"
        label="Threads"
        value={values.threads}
        onChange={onChange}
        fieldId={fieldId}
        placeholder={mode === 'create' ? 'Ej: 16' : undefined}
      />
      <TextField
        mode={mode}
        name="frequency"
        label="Frecuencia (GHz)"
        value={values.frequency}
        onChange={onChange}
        fieldId={fieldId}
        placeholder={mode === 'create' ? 'Ej: 4.2' : undefined}
      />
      <SelectField
        mode={mode}
        name="integratedGraphics"
        label="Graficos integrados"
        value={values.integratedGraphics}
        onChange={onChange}
        fieldId={fieldId}
        options={BOOLEAN_OPTIONS}
        labels={BOOLEAN_LABELS}
      />
      <SelectField
        mode={mode}
        name="includesCooler"
        label="Incluye cooler"
        value={values.includesCooler}
        onChange={onChange}
        fieldId={fieldId}
        options={BOOLEAN_OPTIONS}
        labels={
          mode === 'create'
            ? { false: 'No (Requiere comprar aparte)', true: 'Si (De stock)' }
            : BOOLEAN_LABELS
        }
      />
    </>
  );
}

export function MotherboardSpecsFields({
  mode,
  values,
  onChange,
  fieldId,
  onToggle,
  optionId,
  brands,
  sockets,
  formFactors,
  ramTypes,
  m2FormFactors,
}: SharedSpecsProps &
  MultiValueProps & {
    brands: string[];
    sockets: string[];
    formFactors: string[];
    ramTypes: string[];
    m2FormFactors: string[];
  }) {
  return (
    <>
      <SelectField
        mode={mode}
        name="brand"
        label="Marca"
        value={values.brand}
        onChange={onChange}
        fieldId={fieldId}
        options={brands}
        placeholder={mode === 'create' ? 'Selecciona marca' : undefined}
        required={mode === 'create'}
      />
      <SelectField
        mode={mode}
        name="socket"
        label="Socket"
        value={values.socket}
        onChange={onChange}
        fieldId={fieldId}
        options={sockets}
      />
      <SelectField
        mode={mode}
        name="formFactor"
        label="Formato"
        value={values.formFactor}
        onChange={onChange}
        fieldId={fieldId}
        options={formFactors}
      />
      <SelectField
        mode={mode}
        name="memoryType"
        label="Tipo de RAM"
        value={values.memoryType}
        onChange={onChange}
        fieldId={fieldId}
        options={ramTypes}
      />
      {mode === 'create' ? (
        <>
          <SelectField
            mode={mode}
            name="memorySlots"
            label="Slots de RAM"
            value={values.memorySlots}
            onChange={onChange}
            fieldId={fieldId}
            options={['2', '4', '8']}
            labels={{ 2: '2 Slots', 4: '4 Slots', 8: '8 Slots' }}
          />
          <SelectField
            mode={mode}
            name="m2Slots"
            label="Slots M.2"
            value={values.m2Slots}
            onChange={onChange}
            fieldId={fieldId}
            options={['1', '2', '3', '4']}
            labels={{ 1: '1 Slot', 2: '2 Slots', 3: '3 Slots', 4: '4 Slots' }}
          />
        </>
      ) : (
        <>
          <NumberField
            mode={mode}
            name="memorySlots"
            label="Slots RAM"
            value={values.memorySlots}
            onChange={onChange}
            fieldId={fieldId}
          />
          <NumberField
            mode={mode}
            name="m2Slots"
            label="Slots M.2"
            value={values.m2Slots}
            onChange={onChange}
            fieldId={fieldId}
          />
        </>
      )}
      <MultiCheckField
        mode={mode}
        name="supportedM2FormFactors"
        label={mode === 'create' ? 'Tamanos M.2 soportados' : 'Tamaños M.2 soportados'}
        options={m2FormFactors}
        values={values.supportedM2FormFactors}
        onToggle={onToggle}
        optionId={optionId}
        fieldId={fieldId}
      />
    </>
  );
}

export function RamSpecsFields({
  mode,
  values,
  onChange,
  fieldId,
  brands,
  ramTypes,
  capacities,
}: SharedSpecsProps & {
  brands: string[];
  ramTypes: string[];
  capacities: Array<string | number>;
}) {
  const capacityLabels = Object.fromEntries(
    capacities.map((value) => [String(value), `${value} GB`]),
  );
  return (
    <>
      <SelectField
        mode={mode}
        name="brand"
        label="Marca"
        value={values.brand}
        onChange={onChange}
        fieldId={fieldId}
        options={brands}
        placeholder={mode === 'create' ? 'Selecciona marca' : undefined}
        required={mode === 'create'}
      />
      <SelectField
        mode={mode}
        name="memoryType"
        label="Tipo de RAM"
        value={values.memoryType}
        onChange={onChange}
        fieldId={fieldId}
        options={ramTypes}
      />
      <SelectField
        mode={mode}
        name="capacity"
        label="Capacidad por modulo (GB)"
        value={values.capacity}
        onChange={onChange}
        fieldId={fieldId}
        options={capacities}
        labels={capacityLabels}
      />
      <SelectField
        mode={mode}
        name="modules"
        label="Modulos"
        value={values.modules}
        onChange={onChange}
        fieldId={fieldId}
        options={['1', '2', '4']}
        labels={{ 1: '1 Modulo (Single)', 2: '2 Modulos (Dual Kit)', 4: '4 Modulos (Quad Kit)' }}
      />
      <NumberField
        mode={mode}
        name="speed"
        label="Frecuencia (MHz)"
        value={values.speed}
        onChange={onChange}
        fieldId={fieldId}
        placeholder={mode === 'create' ? 'Ej: 6000' : undefined}
      />
      <TextField
        mode={mode}
        name="latency"
        label="Latencia"
        value={values.latency}
        onChange={onChange}
        fieldId={fieldId}
        placeholder="Ej: CL36"
      />
      <SelectField
        mode={mode}
        name="hasRGB"
        label="Iluminacion RGB"
        value={values.hasRGB}
        onChange={onChange}
        fieldId={fieldId}
        options={BOOLEAN_OPTIONS}
        labels={BOOLEAN_LABELS}
      />
    </>
  );
}

export function GpuSpecsFields({
  mode,
  values,
  onChange,
  fieldId,
  brands,
  chipsets,
  vramOptions,
  vramTypes,
  fanOptions,
}: SharedSpecsProps & {
  brands: string[];
  chipsets: string[];
  vramOptions: string[];
  vramTypes: string[];
  fanOptions: string[];
}) {
  return (
    <>
      <SelectField
        mode={mode}
        name="brand"
        label="Marca ensambladora"
        value={values.brand}
        onChange={onChange}
        fieldId={fieldId}
        options={brands}
        placeholder={mode === 'create' ? 'Selecciona marca' : undefined}
        required={mode === 'create'}
      />
      <SelectField
        mode={mode}
        name="chipset"
        label="Chipset"
        value={values.chipset}
        onChange={onChange}
        fieldId={fieldId}
        options={chipsets}
      />
      <SelectField
        mode={mode}
        name="vram"
        label="VRAM (GB)"
        value={values.vram}
        onChange={onChange}
        fieldId={fieldId}
        options={vramOptions}
        labels={Object.fromEntries(vramOptions.map((value) => [value, `${value} GB`]))}
        required={mode === 'create'}
      />
      <SelectField
        mode={mode}
        name="typeVram"
        label="Tipo de VRAM"
        value={values.typeVram}
        onChange={onChange}
        fieldId={fieldId}
        options={vramTypes}
        required={mode === 'create'}
      />
      <NumberField
        mode={mode}
        name="length"
        label="Largo (mm)"
        value={values.length}
        onChange={onChange}
        fieldId={fieldId}
        placeholder={mode === 'create' ? 'Ej: 320' : undefined}
        required={mode === 'create'}
        helper={mode === 'create' ? 'Vital para validar con Case.' : undefined}
        helperTone="danger"
      />
      <NumberField
        mode={mode}
        name="gpuPowerWatts"
        label="TGP / Consumo real (Watts)"
        value={values.gpuPowerWatts}
        onChange={onChange}
        fieldId={fieldId}
        placeholder={mode === 'create' ? 'Ej: 280' : undefined}
        required={mode === 'create'}
        helper="Usado por el armador para estimar el consumo del sistema."
        helperTone={mode === 'create' ? 'danger' : 'muted'}
      />
      <NumberField
        mode={mode}
        name="recommendedPsuWatts"
        label="PSU recomendada (Watts)"
        value={values.recommendedPsuWatts}
        onChange={onChange}
        fieldId={fieldId}
        placeholder={mode === 'create' ? 'Ej: 650' : undefined}
        helper="Referencia del fabricante para la fuente minima sugerida."
      />
      <SelectField
        mode={mode}
        name="fans"
        label="Ventiladores"
        value={values.fans}
        onChange={onChange}
        fieldId={fieldId}
        options={fanOptions}
      />
    </>
  );
}

export function PsuSpecsFields({
  mode,
  values,
  onChange,
  fieldId,
  brands,
  wattages,
  certifications,
  modularOptions,
}: SharedSpecsProps & {
  brands: string[];
  wattages: string[];
  certifications: string[];
  modularOptions: string[];
}) {
  return (
    <>
      <SelectField
        mode={mode}
        name="brand"
        label="Marca"
        value={values.brand}
        onChange={onChange}
        fieldId={fieldId}
        options={brands}
        placeholder={mode === 'create' ? 'Seleccionar marca' : undefined}
        required={mode === 'create'}
      />
      <SelectField
        mode={mode}
        name="wattage"
        label={mode === 'create' ? 'Potencia (Watts)' : 'Potencia'}
        value={values.wattage}
        onChange={onChange}
        fieldId={fieldId}
        options={wattages}
        labels={Object.fromEntries(wattages.map((value) => [value, `${value} W`]))}
        placeholder={mode === 'create' ? 'Seleccionar potencia' : undefined}
        required={mode === 'create'}
      />
      <SelectField
        mode={mode}
        name="certification"
        label="Certificacion"
        value={values.certification}
        onChange={onChange}
        fieldId={fieldId}
        options={certifications}
      />
      <SelectField
        mode={mode}
        name="modular"
        label="Modularidad"
        value={values.modular}
        onChange={onChange}
        fieldId={fieldId}
        options={modularOptions}
      />
      <SelectField
        mode={mode}
        name="formFactor"
        label="Formato"
        value={values.formFactor}
        onChange={onChange}
        fieldId={fieldId}
        options={['ATX', 'SFX']}
        labels={mode === 'create' ? { ATX: 'ATX (Estandar)', SFX: 'SFX (Pequena)' } : undefined}
      />
    </>
  );
}

export function CaseSpecsFields({
  mode,
  values,
  onChange,
  fieldId,
  onToggle,
  optionId,
  brands,
  formFactors,
  radiatorOptions,
  radiatorLabels,
}: SharedSpecsProps &
  MultiValueProps & {
    brands: string[];
    formFactors: string[];
    radiatorOptions: string[];
    radiatorLabels: Record<string, string>;
  }) {
  return (
    <>
      <SelectField
        mode={mode}
        name="brand"
        label="Marca"
        value={values.brand}
        onChange={onChange}
        fieldId={fieldId}
        options={brands}
        placeholder={mode === 'create' ? 'Seleccionar marca' : undefined}
        required={mode === 'create'}
      />
      <MultiCheckField
        mode={mode}
        name="supportedFormFactors"
        label="Soporte de placa"
        options={formFactors}
        values={values.supportedFormFactors}
        onToggle={onToggle}
        optionId={optionId}
        fieldId={fieldId}
        createColumns="md:grid-cols-4"
      />
      <NumberField
        mode={mode}
        name="maxGpuLength"
        label="Max Largo GPU (mm)"
        value={values.maxGpuLength}
        onChange={onChange}
        fieldId={fieldId}
        placeholder={mode === 'create' ? 'Ej: 340' : undefined}
        required={mode === 'create'}
      />
      <SelectField
        mode={mode}
        name="includesPsu"
        label="Incluye fuente"
        value={values.includesPsu}
        onChange={onChange}
        fieldId={fieldId}
        options={BOOLEAN_OPTIONS}
        labels={mode === 'create' ? { false: 'No', true: 'Si (Generica)' } : BOOLEAN_LABELS}
      />
      <MultiCheckField
        mode={mode}
        name="radiatorSupportMmValues"
        label="Soporte radiador líquido"
        options={radiatorOptions}
        values={values.radiatorSupportMmValues}
        labels={radiatorLabels}
        onToggle={onToggle}
        optionId={optionId}
        fieldId={fieldId}
        createColumns="md:grid-cols-4"
      />
      <SelectField
        mode={mode}
        name="supportsTowerCooler"
        label="¿Soporta refrigeración de torre?"
        value={values.supportsTowerCooler}
        onChange={onChange}
        fieldId={fieldId}
        options={BOOLEAN_OPTIONS}
        labels={{ false: 'No', true: 'Sí' }}
        placeholder="Seleccionar"
        required={mode === 'create'}
      />
      <NumberField
        mode={mode}
        name="includedFans"
        label="Ventiladores Incluidos"
        value={values.includedFans}
        onChange={onChange}
        fieldId={fieldId}
        placeholder={mode === 'create' ? 'Ej: 3' : undefined}
      />
    </>
  );
}

export function CoolerSpecsFields({
  mode,
  values,
  onChange,
  fieldId,
  onToggle,
  optionId,
  brands,
  types,
  sockets,
  radiatorOptions,
}: SharedSpecsProps &
  MultiValueProps & {
    brands: string[];
    types: string[];
    sockets: string[];
    radiatorOptions: string[];
  }) {
  const typeField =
    mode === 'create' ? (
      <RadioField
        name="type"
        label="Tipo de Refrigeracion"
        value={values.type}
        options={types}
        onChange={onChange}
        optionId={optionId}
      />
    ) : (
      <SelectField
        mode={mode}
        name="type"
        label="Tipo"
        value={values.type}
        onChange={onChange}
        fieldId={fieldId}
        options={types}
      />
    );
  const liquidField =
    values.type === 'Líquida' ? (
      <SelectField
        mode={mode}
        name="radiatorSize"
        label={mode === 'create' ? 'Tamano Radiador' : 'Radiador'}
        value={values.radiatorSize}
        onChange={onChange}
        fieldId={fieldId}
        options={radiatorOptions}
        labels={Object.fromEntries(radiatorOptions.map((value) => [value, `${value} mm`]))}
        required={mode === 'create'}
      />
    ) : null;
  const rgbField = (
    <SelectField
      mode={mode}
      name="hasRGB"
      label={mode === 'create' ? 'RGB?' : 'RGB'}
      value={values.hasRGB}
      onChange={onChange}
      fieldId={fieldId}
      options={BOOLEAN_OPTIONS}
      labels={BOOLEAN_LABELS}
    />
  );
  const screenField = (
    <SelectField
      mode={mode}
      name="hasScreen"
      label={mode === 'create' ? 'Tiene Pantalla LCD?' : 'Pantalla LCD'}
      value={values.hasScreen}
      onChange={onChange}
      fieldId={fieldId}
      options={BOOLEAN_OPTIONS}
      labels={BOOLEAN_LABELS}
    />
  );
  const socketField = (
    <MultiCheckField
      mode={mode}
      name="compatibleSockets"
      label="Sockets compatibles"
      options={sockets}
      values={values.compatibleSockets}
      onToggle={onToggle}
      optionId={optionId}
      fieldId={fieldId}
    />
  );

  return (
    <>
      <SelectField
        mode={mode}
        name="brand"
        label="Marca"
        value={values.brand}
        onChange={onChange}
        fieldId={fieldId}
        options={brands}
        placeholder={mode === 'create' ? 'Seleccionar marca' : undefined}
        required={mode === 'create'}
      />
      {typeField}
      {mode === 'create' && socketField}
      <NumberField
        mode={mode}
        name="tdpCapacity"
        label="TDP soportado (Watts)"
        value={values.tdpCapacity}
        onChange={onChange}
        fieldId={fieldId}
        placeholder={mode === 'create' ? 'Ej: 180' : undefined}
        required={mode === 'create'}
        helper={mode === 'create' ? 'Debe ser igual o mayor al TDP del CPU.' : undefined}
      />
      {liquidField}
      {mode === 'create' ? (
        <>
          {screenField}
          {rgbField}
        </>
      ) : (
        <>
          {rgbField}
          {screenField}
          {socketField}
        </>
      )}
    </>
  );
}

export function StorageSpecsFields({
  mode,
  values,
  onChange,
  fieldId,
  types,
  interfaces,
  m2FormFactors,
}: SharedSpecsProps & { types: string[]; interfaces: string[]; m2FormFactors: string[] }) {
  const isM2 = values.type === 'Sólido M.2';
  return (
    <>
      <SelectField
        mode={mode}
        name="type"
        label="Tipo"
        value={values.type}
        onChange={onChange}
        fieldId={fieldId}
        options={types}
      />
      {isM2 && (
        <SelectField
          mode={mode}
          name="interface"
          label="Generacion"
          value={values.interface}
          onChange={onChange}
          fieldId={fieldId}
          options={interfaces}
        />
      )}
      <NumberField
        mode={mode}
        name="capacity"
        label="Capacidad (GB)"
        value={values.capacity}
        onChange={onChange}
        fieldId={fieldId}
        placeholder={mode === 'create' ? 'Ej: 1000' : undefined}
        required={mode === 'create'}
      />
      <NumberField
        mode={mode}
        name="readSpeed"
        label={mode === 'create' ? 'Velocidad Lectura (MB/s)' : 'Lectura (MB/s)'}
        value={values.readSpeed}
        onChange={onChange}
        fieldId={fieldId}
        placeholder={mode === 'create' ? 'Ej: 7000' : undefined}
      />
      <NumberField
        mode={mode}
        name="writeSpeed"
        label={mode === 'create' ? 'Velocidad Escritura (MB/s)' : 'Escritura (MB/s)'}
        value={values.writeSpeed}
        onChange={onChange}
        fieldId={fieldId}
        placeholder={mode === 'create' ? 'Ej: 5000' : undefined}
      />
      {isM2 && (
        <SelectField
          mode={mode}
          name="m2FormFactor"
          label={mode === 'create' ? 'Tamano fisico M.2' : 'Tamaño físico M.2'}
          value={values.m2FormFactor}
          onChange={onChange}
          fieldId={fieldId}
          options={m2FormFactors}
        />
      )}
    </>
  );
}
