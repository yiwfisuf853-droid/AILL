import { useState, useEffect } from 'react';
import { useShopStore } from '@/features/shop/store';
import { useAuthStore } from '@/features/auth/store';
import { isApiError } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { IconShop, IconStar, IconSave, IconRefresh } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { ProductCard } from './ProductCard';
import { OrderList } from './OrderList';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { shopApi } from '../api';
import { cn } from '@/lib/utils';

type ShopTab = 'products' | 'orders' | 'redemptions';

export function ShopPage() {
  const user = useAuthStore(s => s.user);
  const { products, orders, loading, fetchProducts, fetchOrders, purchaseProduct } = useShopStore();
  const [activeTab, setActiveTab] = useState<ShopTab>('products');
  const [redemptions, setRedemptions] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (user && activeTab === 'orders') fetchOrders(user.id);
    if (user && activeTab === 'redemptions') fetchRedemptions();
  }, [user, activeTab, fetchOrders]);

  const fetchRedemptions = async () => {
    if (!user) return;
    try {
      const res = await shopApi.getRedemptions(user.id);
      setRedemptions(Array.isArray(res) ? res : []);
    } catch {}
  };

  async function handleBuy(product: typeof products[0]) {
    if (!user) { toast('请先登录'); return; }
    const ok = await purchaseProduct(user.id, product);
    if (ok) { toast.success('购买成功！'); } else { toast.error('购买失败'); }
  }

  const tabs: { key: ShopTab; label: string; icon: any }[] = [
    { key: 'products', label: '商品', icon: IconShop },
    { key: 'orders', label: '订单', icon: IconSave },
    { key: 'redemptions', label: '兑换记录', icon: IconRefresh },
  ];

  return (
    <div className="py-3" data-name="shop">
      <div className="relative overflow-hidden border-b border-border" data-name="shopHero">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, transparent 40%, hsl(var(--primary) / 0.04) 100%)' }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20" style={{ background: 'hsl(var(--primary))' }} />
        <div className="relative pt-10 pb-6" data-name="shopHeroContent">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg border" data-name="shopHeroIcon" style={{ background: 'hsl(var(--primary) / 0.15)', borderColor: 'hsl(var(--primary) / 0.25)' }}>
              <IconShop size={20} style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" data-name="shopTitle">
              AILL <span className="textGradientBrand">Shop</span>
            </h1>
          </div>
          <p className="text-foreground-secondary text-sm ml-[52px]" data-name="shopDesc">用积分兑换精彩好物</p>
        </div>
      </div>

      <div className="py-8" data-name="shopContent">
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit mb-6" data-name="shopTabs">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              data-name={`shopTab${t.key}`}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                activeTab === t.key
                  ? 'text-white shadow-md'
                  : 'text-foreground-tertiary hover:text-foreground-secondary'
              )}
              style={activeTab === t.key ? {
                background: 'hsl(var(--primary))',
                boxShadow: '0 2px 12px hsl(var(--primary) / 0.3)',
              } : undefined}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {loading && activeTab === 'products' && products.length === 0 ? (
          <PageSkeleton />
        ) : activeTab === 'products' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-name="shopProductGrid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onBuy={handleBuy} />
            ))}
          </div>
        ) : activeTab === 'orders' ? (
          !user ? (
            <div className="text-center py-20 text-foreground-tertiary" data-name="shopLoginRequired">
              <IconSave size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">登录后查看订单</p>
            </div>
          ) : (
            <OrderList orders={orders} />
          )
        ) : !user ? (
          <div className="text-center py-20 text-foreground-tertiary" data-name="shopRedemptionsLogin">
            <p className="text-sm">登录后查看兑换记录</p>
          </div>
        ) : redemptions.length === 0 ? (
          <div className="text-center py-20 text-foreground-tertiary" data-name="shopRedemptionsEmpty">
            <p className="text-sm">暂无兑换记录</p>
          </div>
        ) : (
          <div className="space-y-3" data-name="shopRedemptionsList">
            {redemptions.map((r: any) => (
              <div key={r.id} className="cardInteractive p-4" data-name={`redemption${r.id}`}>
                <div className="flex items-center justify-between mb-2" data-name={`redemption${r.id}Header`}>
                  <span className="text-sm font-medium text-foreground" data-name={`redemption${r.id}Product`}>{r.productName || `商品 #${r.productId}`}</span>
                  <span className="text-xs text-foreground-tertiary" data-name={`redemption${r.id}Date`}>
                    {new Date(r.createdAt || r.redeemedAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground-tertiary" data-name={`redemption${r.id}Info`}>
                  <span className="flex items-center gap-1"><IconStar size={11} /> {r.pointsCost || r.points || 0} 积分</span>
                  <span className="tagPill text-[9px] bg-success/10 text-success">已兑换</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
