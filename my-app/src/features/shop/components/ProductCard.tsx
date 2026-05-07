import { IconShop, IconStar } from '@/components/ui/Icon';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onBuy: (product: Product) => void;
}

export function ProductCard({ product, onBuy }: ProductCardProps) {
  const typeLabel = (t: number) => {
    const map: Record<number, string> = { 1: '虚拟', 2: '实体', 3: '兑换码' };
    return map[t] || '商品';
  };

  return (
    <div className="cardInteractive overflow-hidden group" data-name={`productCard${product.id}`}>
      <div className="aspect-[4/3] bg-gradient-to-br from-muted to-card flex items-center justify-center relative overflow-hidden" data-name={`productCard${product.id}Image`}>
        <IconShop size={48} className="text-foreground-tertiary/25 group-hover:text-primary/15 transition-colors" />
        <div className="absolute top-3 left-3">
          <span className="tagPill text-[9px]" data-name={`productCard${product.id}Type`}>{typeLabel(product.type)}</span>
        </div>
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center" data-name={`productCard${product.id}SoldOut`}>
            <span className="text-foreground-secondary font-semibold text-sm">已售罄</span>
          </div>
        )}
      </div>
      <div className="p-4" data-name={`productCard${product.id}Info`}>
        <h3 className="font-semibold text-sm mb-1 text-foreground group-hover:text-primary transition-colors line-clamp-1" data-name={`productCard${product.id}Name`}>{product.name}</h3>
        <p className="text-xs text-foreground-tertiary mb-3 line-clamp-2" data-name={`productCard${product.id}Desc`}>{product.description}</p>
        <div className="flex items-center justify-between" data-name={`productCard${product.id}PriceRow`}>
          <div className="flex items-center gap-2" data-name={`productCard${product.id}Prices`}>
            {product.pointsPrice > 0 && (
              <span className="flex items-center gap-1 text-sm font-bold text-chart-2" data-name={`productCard${product.id}PointsPrice`}>
                <IconStar size={14} /> {product.pointsPrice}
              </span>
            )}
            {product.price > 0 && (
              <span className="flex items-center gap-1 text-sm font-bold text-accent" data-name={`productCard${product.id}Price`}>
                <IconStar size={14} /> {product.price}
              </span>
            )}
          </div>
          <button
            onClick={() => onBuy(product)}
            disabled={product.stock === 0}
            data-name={`productCard${product.id}BuyBtn`}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium transition-all bg-primary text-primary-foreground hover:bg-primary-hover disabled:bg-muted disabled:text-foreground-tertiary"
          >
            {product.stock === 0 ? '售罄' : '兑换'}
          </button>
        </div>
        {product.stock > 0 && product.stock < 999 && (
          <p className="text-xs text-foreground-tertiary mt-2.5" data-name={`productCard${product.id}Stock`}>库存: {product.stock}</p>
        )}
      </div>
    </div>
  );
}
