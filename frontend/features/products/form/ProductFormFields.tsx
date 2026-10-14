'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { ProductArrayField, ProductFormData, ProductFormField } from './productFormState';

type ProductFormContextValue = {
  values: ProductFormData;
  setField: (name: ProductFormField, value: string) => void;
  toggleValue: (field: ProductArrayField, value: string) => void;
};

const ProductFormContext = createContext<ProductFormContextValue | null>(null);

export const ProductFormProvider = ProductFormContext.Provider;

export function useProductForm() {
  const context = useContext(ProductFormContext);
  if (!context) throw new Error('useProductForm must be used inside ProductFormProvider');
  return context;
}

export const LABEL_CLASS =
  'mb-2 block text-xs font-extrabold uppercase tracking-wide text-gray-500';
export const INPUT_CLASS =
  'w-full rounded-xl border border-gray-200 bg-white p-3 font-medium text-gray-800 outline-none transition focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20';

export const fieldId = (name: string) => `product-${name}`;

export function optionId(name: string, value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${fieldId(name)}-${slug}`;
}

export const BOOLEAN_OPTIONS = ['false', 'true'];
export const YES_NO = { false: 'No', true: 'Si' };

type BaseFieldProps = {
  name: ProductFormField;
  label: string;
  helper?: string;
  helperTone?: 'muted' | 'danger';
  required?: boolean;
  wide?: boolean;
};

function FieldShell({
  name,
  label,
  helper,
  helperTone = 'muted',
  wide,
  children,
}: Omit<BaseFieldProps, 'required'> & { children: ReactNode }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <label htmlFor={fieldId(name)} className={LABEL_CLASS}>
        {label}
      </label>
      {children}
      {helper && (
        <span
          className={`mt-1 block text-xs ${helperTone === 'danger' ? 'text-red-500' : 'text-gray-500'}`}
        >
          {helper}
        </span>
      )}
    </div>
  );
}

function useStringValue(name: ProductFormField) {
  const { values, setField } = useProductForm();
  const value = values[name];
  return { value: Array.isArray(value) ? '' : value, setField };
}

export function TextField({
  placeholder,
  maxLength,
  ...props
}: BaseFieldProps & { placeholder?: string; maxLength?: number }) {
  const { value, setField } = useStringValue(props.name);
  return (
    <FieldShell {...props}>
      <input
        id={fieldId(props.name)}
        name={props.name}
        value={value}
        onChange={(event) => setField(props.name, event.target.value)}
        className={INPUT_CLASS}
        placeholder={placeholder}
        maxLength={maxLength}
        required={props.required}
      />
    </FieldShell>
  );
}

export function NumberField({
  placeholder,
  step,
  ...props
}: BaseFieldProps & { placeholder?: string; step?: string }) {
  const { value, setField } = useStringValue(props.name);
  return (
    <FieldShell {...props}>
      <input
        id={fieldId(props.name)}
        name={props.name}
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => setField(props.name, event.target.value)}
        className={INPUT_CLASS}
        placeholder={placeholder}
        required={props.required}
      />
    </FieldShell>
  );
}

export function SelectField({
  options,
  labels = {},
  placeholder,
  ...props
}: BaseFieldProps & {
  options: readonly string[];
  labels?: Record<string, string>;
  placeholder?: string;
}) {
  const { value, setField } = useStringValue(props.name);
  // Keep legacy values that are no longer offered so editing never silently changes them.
  const visibleOptions = value && !options.includes(value) ? [...options, value] : options;
  return (
    <FieldShell {...props}>
      <select
        id={fieldId(props.name)}
        name={props.name}
        value={value}
        onChange={(event) => setField(props.name, event.target.value)}
        className={INPUT_CLASS}
        required={props.required}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {visibleOptions.map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? option}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function BooleanField({
  labels = YES_NO,
  ...props
}: BaseFieldProps & { labels?: Record<string, string> }) {
  return <SelectField {...props} options={BOOLEAN_OPTIONS} labels={labels} />;
}

export function MultiCheckField({
  name,
  label,
  options,
  labels = {},
  columns = 'md:grid-cols-4',
}: {
  name: ProductArrayField;
  label: string;
  options: readonly string[];
  labels?: Record<string, string>;
  columns?: string;
}) {
  const { values, toggleValue } = useProductForm();
  const selected = values[name];
  return (
    <fieldset className="col-span-2">
      <legend className={LABEL_CLASS}>{label}</legend>
      <div className={`grid grid-cols-2 gap-2 ${columns}`}>
        {options.map((option) => {
          const id = optionId(name, option);
          const checked = selected.includes(option);
          return (
            <label
              key={option}
              htmlFor={id}
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
                onChange={() => toggleValue(name, option)}
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

export function RadioField({
  name,
  label,
  options,
}: {
  name: ProductFormField;
  label: string;
  options: readonly string[];
}) {
  const { value, setField } = useStringValue(name);
  return (
    <fieldset className="col-span-2">
      <legend className={LABEL_CLASS}>{label}</legend>
      <div className="flex gap-4">
        {options.map((option) => {
          const id = optionId(name, option);
          return (
            <label
              key={option}
              htmlFor={id}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-white p-3 hover:bg-cyan-50"
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={option}
                checked={value === option}
                onChange={() => setField(name, option)}
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SectionTitle({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="col-span-2 mt-2 flex items-center gap-2 border-b border-gray-200 pb-2 font-bold text-gray-600">
      {icon}
      {children}
    </div>
  );
}
