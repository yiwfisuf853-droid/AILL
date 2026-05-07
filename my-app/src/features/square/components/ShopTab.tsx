import { useEffect } from 'react';
import { useShopStore } from '@/features/shop/store';
import { useAuthStore } from '@/features/auth/store';
import { isApiError } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { IconShop, IconStar, IconSave } from '@/components/ui/Icon';
import { PageSkeleton } from '@/components/ui/Skeleton';

export function ShopTab() {
  const user = useAuthStore(s => s.user);
  const { products, loading, fetchProducts, purchaseProduct } = useShopStore();

  useEffect(() => {
    fetchProducts();
  }, []);

  async function handleBuy(product: typeof products[0]) {
    if (!user) { toast('请先登录'); return; }
    const ok = await purchaseProduct(user.id, product);
    if (ok) { toast.success('购买成功！'); } else { toast.error('购买失败'); }
  }

  const typeLabel = (t: number) => {
    const map: Record<number, string> = { 1: '虚拟', 2: '实体', 3: '兑换码' };
    return map[t] || '商品';
  };

  return (
    <div data-name="shopTab">
      {loading && products.length === 0 ? (
        <PageSkeleton />
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-foreground-tertiary" data-name="shopTabEmpty">
          <IconShop size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无商品</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-name="shopTabGrid">
          {products.map((p) => (
            <div
              key={p.id}
              className="cardInteractive overflow-hidden group"
              data-name={`shopTabProduct${p.id}`}
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-muted to-card flex items-center justify-center relative" data-name={`shopTabProduct${p.id}Image`}>
                <IconShop size={40} className="text-foreground-tertiary/20 group-hover:text-primary/15 transition-colors" />
                <div className="absolute top-2 left-2">
                  <span className="tagPill text-[9px]" data-name={`shopTabProduct${p.id}Type`}>{typeLabel(p.type)}</span>
                </div>
                {p.stock === 0 && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center" data-name={`shopTabProduct${p.id}SoldOut`}>
                    <span className="text-foreground-secondary font-semibold text-xs">已售罄</span>
                  </div>
                )}
              </div>
              <div className="p-3" data-name={`shopTabProduct${p.id}Info`}>
                <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1" data-name={`shopTabProduct${p.id}Name`}>{p.name}</h4>
                <p className="text-[10px] text-foreground-tertiary line-clamp-1 mb-2" data-name={`shopTabProduct${p.id}Desc`}>{p.description}</p>
                <div className="flex items-center justify-between" data-name={`shopTabProduct${p.id}PriceRow`}>
                  <span className="flex items-center gap-1 text-xs font-bold text-chart-2" data-name={`shopTabProduct${p.id}Price`}>
                    <IconStar size={11} /> {p.pointsPrice || p.price}
                  </span>
                  <button
                    onClick={() => handleBuy(p)}
                    disabled={p.stock === 0}
                    data-name={`shopTabProduct${p.id}BuyBtn`}
                    className="px-2 py-1 rounded text-[10px] font-medium bg-primary text-white hover:bg-primary-hover disabled:bg-muted disabled:text-foreground-tertiary transition-colors"
                  >
                    {p.stock === 0 ? '售罄' : '兑换'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
