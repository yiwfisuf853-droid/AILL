import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShopStore } from '@/features/shop/store';
import { useAuthStore } from '@/features/auth/store';
import { isApiError } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { IconSave, IconShop, IconStar } from "@/components/ui/Icon";
import { PageSkeleton } from '@/components/ui/Skeleton';

export function ShopPage() {
  const user = useAuthStore(s => s.user);
  const { products, orders, loading, activeTab, fetchProducts, fetchOrders, setActiveTab, purchaseProduct } = useShopStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (user && activeTab === 'orders') fetchOrders(user.id);
  }, [user, activeTab, fetchOrders]);

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
    <div className="py-3" data-name="shop">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-border" data-name="shopHero">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(340 75% 58% / 0.08) 0%, transparent 40%, hsl(340 75% 58% / 0.04) 100%)' }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20" style={{ background: 'hsl(340 75% 58%)' }} />
        <div className="relative pt-10 pb-6" data-name="shopHeroContent">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg border" data-name="shopHeroIcon" style={{ background: 'hsl(340 75% 58% / 0.15)', borderColor: 'hsl(340 75% 58% / 0.25)' }}>
              <IconShop size={20} style={{ color: 'hsl(340 75% 58%)' }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" data-name="shopTitle">
              AILL <span style={{ background: 'linear-gradient(135deg, hsl(340 75% 58%), hsl(340 60% 70%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Shop</span>
            </h1>
          </div>
          <p className="text-foreground-secondary text-sm ml-[52px]" data-name="shopDesc">用积分兑换精彩好物</p>
        </div>
      </div>

      <div className="py-8" data-name="shopContent">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit mb-6" data-name="shopTabs">
          <button
            onClick={() => setActiveTab('products')}
            data-name="shopProductsTab"
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'products'
                ? 'text-white shadow-md'
                : 'text-foreground-tertiary hover:text-foreground-secondary'
            }`}
            style={activeTab === 'products' ? {
              background: 'hsl(340 75% 58%)',
              boxShadow: '0 2px 12px hsl(340 75% 58% / 0.3)',
            } : undefined}
          >
            <IconShop size={16} />
            商品
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            data-name="shopOrdersTab"
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'orders'
                ? 'text-white shadow-md'
                : 'text-foreground-tertiary hover:text-foreground-secondary'
            }`}
            style={activeTab === 'orders' ? {
              background: 'hsl(340 75% 58%)',
              boxShadow: '0 2px 12px hsl(340 75% 58% / 0.3)',
            } : undefined}
          >
            <IconSave size={16} />
            订单
          </button>
        </div>

        {loading ? (
          <PageSkeleton />
        ) : activeTab === 'products' ? (
          /* Product Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-name="shopProductGrid">
            {products.map((p) => (
              <div
                key={p.id}
                className="cardInteractive overflow-hidden group revealItem"
                data-name={`shopProduct${p.id}`}
              >
                {/* Image area */}
                <div className="aspect-[4/3] bg-gradient-to-br from-muted to-card flex items-center justify-center relative overflow-hidden" data-name={`shopProduct${p.id}Image`}>
                  <IconShop size={56} className="text-foreground-tertiary/30 group-hover:text-primary/20 transition-colors" />
                  <div className="absolute top-3 left-3">
                    <span className="tagPill" data-name={`shopProduct${p.id}TypeBadge`}>
                      {typeLabel(p.type)}
                    </span>
                  </div>
                  {p.stock === 0 && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center" data-name={`shopProduct${p.id}SoldOut`}>
                      <span className="text-foreground-secondary font-semibold text-sm tracking-wide">已售罄</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4" data-name={`shopProduct${p.id}Info`}>
                  <h3 className="font-semibold text-sm mb-1 text-foreground group-hover:text-primary transition-colors" data-name={`shopProduct${p.id}Name`}>{p.name}</h3>
                  <p className="text-xs text-foreground-tertiary mb-3 line-clamp-2" data-name={`shopProduct${p.id}Desc`}>{p.description}</p>

                  <div className="flex items-center justify-between" data-name={`shopProduct${p.id}PriceRow`}>
                    <div className="flex items-center gap-2" data-name={`shopProduct${p.id}Prices`}>
                      {p.pointsPrice > 0 && (
                        <span className="flex items-center gap-1 text-sm font-bold text-chart-2" data-name={`shopProduct${p.id}PointsPrice`}>
                          <IconStar size={14} />
                          {p.pointsPrice}
                        </span>
                      )}
                      {p.price > 0 && (
                        <span className="flex items-center gap-1 text-sm font-bold text-accent" data-name={`shopProduct${p.id}Price`}>
                          <IconStar size={14} />
                          {p.price}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleBuy(p)}
                      disabled={p.stock === 0}
                      data-name={`shopProduct${p.id}BuyBtn`}
                      className="px-3.5 py-1.5 rounded-md text-xs font-medium transition-all
                        bg-primary text-primary-foreground hover:bg-primary-hover
                        disabled:bg-muted disabled:text-foreground-tertiary"
                    >
                      {p.stock === 0 ? '售罄' : '兑换'}
                    </button>
                  </div>

                  {p.stock > 0 && p.stock < 999 && (
                    <p className="text-xs text-foreground-tertiary mt-2.5" data-name={`shopProduct${p.id}Stock`}>库存: {p.stock}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : !user ? (
          <div className="text-center py-20 text-foreground-tertiary" data-name="shopLoginRequired">
            <IconSave size={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">登录后查看订单</p>
          </div>
        ) : !orders.length ? (
          <div className="text-center py-20 text-foreground-tertiary" data-name="shopOrdersEmpty">
            <IconSave size={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">暂无订单</p>
          </div>
        ) : (
          <div className="space-y-3" data-name="shopOrderList">
            {orders.map((o: any) => (
              <div key={o.id} className="cardInteractive p-4" data-name={`shopOrder${o.id}`}>
                <div className="flex items-center justify-between mb-2" data-name={`shopOrder${o.id}Header`}>
                  <span className="text-sm font-medium text-foreground" data-name={`shopOrder${o.id}Id`}>订单 {o.id?.slice(-6)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    o.status === 'paid' || o.status === 2 ? 'bg-green-500/10 text-green-400' :
                    o.status === 'cancelled' || o.status === 3 ? 'bg-red-500/10 text-red-400' :
                    'bg-amber-500/10 text-amber-400'
                  }`} data-name={`shopOrder${o.id}Status`}>
                    {o.status === 'paid' || o.status === 2 ? '已支付' :
                     o.status === 'cancelled' || o.status === 3 ? '已取消' : '待支付'}
                  </span>
                </div>
                <div className="text-xs text-foreground-tertiary" data-name={`shopOrder${o.id}Info`}>
                  {new Date(o.createdAt).toLocaleString('zh-CN')}
                  {o.totalAmount && <span className="ml-3">金额: {o.totalAmount}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
