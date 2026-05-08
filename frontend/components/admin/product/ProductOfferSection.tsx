'use client';

type ProductOfferSectionProps = {
  isOnSale: string;
  price: string;
  salePrice: string;
  onToggle: (checked: boolean) => void;
  onSalePriceChange: (value: string) => void;
  inputClassName?: string;
  labelClassName?: string;
  layout?: 'grid' | 'stack';
};

function getDiscountPercent(price: string, salePrice: string) {
  const normalPrice = Number(price);
  const offerPrice = Number(salePrice);
  if (!Number.isFinite(normalPrice) || !Number.isFinite(offerPrice) || normalPrice <= 0 || offerPrice <= 0 || offerPrice >= normalPrice) {
    return '0%';
  }

  return `${Math.round(((normalPrice - offerPrice) / normalPrice) * 100)}%`;
}

export default function ProductOfferSection({
  isOnSale,
  price,
  salePrice,
  onToggle,
  onSalePriceChange,
  inputClassName = 'input-admin',
  labelClassName = 'label-admin',
  layout = 'grid',
}: ProductOfferSectionProps) {
  const enabled = isOnSale === 'true';

  return (
    <div className="col-span-2 rounded-xl border border-cyan-100 bg-cyan-50/40 p-4">
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <div>
          <span className="block text-sm font-black text-gray-800">Producto en oferta</span>
          <span className="text-xs font-semibold text-gray-500">Estado: {enabled ? 'Si' : 'No'}</span>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
          className="h-6 w-11 cursor-pointer accent-brand-cyan"
        />
      </label>

      {enabled && (
        <div className={layout === 'grid' ? 'mt-4 grid grid-cols-1 gap-4 md:grid-cols-2' : 'mt-4'}>
          <div>
            <label className={labelClassName}>Precio de oferta (S/.)</label>
            <input
              name="salePrice"
              type="number"
              step="0.01"
              value={salePrice}
              onChange={(event) => onSalePriceChange(event.target.value)}
              inputMode="decimal"
              className={inputClassName}
              placeholder="0.00"
            />
          </div>
          <div className={layout === 'grid' ? 'flex items-end' : ''}>
            <p className="mt-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-brand-cyan shadow-sm">
              Descuento aproximado: {getDiscountPercent(price, salePrice)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
