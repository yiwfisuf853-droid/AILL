import type { CanonicalOrderStatus, Order } from '../types';
import { normalizeOrderStatus } from '../types';

const orderStatusConfig: Record<CanonicalOrderStatus, { label: string; className: string }> = {
  pending: { label: '待支付', className: 'bg-warning/10 text-warning' },
  paid: { label: '已支付', className: 'bg-success/10 text-success' },
  completed: { label: '已完成', className: 'bg-info/10 text-info' },
  cancelled: { label: '已取消', className: 'bg-destructive/10 text-destructive' },
};

interface OrderListProps {
  orders: Order[];
}

export function OrderList({ orders }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-16 text-foreground-tertiary" data-name="orderListEmpty">
        <p className="text-sm">暂无订单</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-name="orderList">
      {orders.map((o) => {
        const status = orderStatusConfig[normalizeOrderStatus(o.status)];
        return (
        <div key={o.id} className="cardInteractive p-4" data-name={`order${o.id}`}>
          <div className="flex items-center justify-between mb-2" data-name={`order${o.id}Header`}>
            <span className="text-sm font-medium text-foreground" data-name={`order${o.id}Id`}>订单 {o.id?.slice(-6)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${status.className}`} data-name={`order${o.id}Status`}>
              {status.label}
            </span>
          </div>
          {o.items && o.items.length > 0 && (
            <div className="space-y-1 mb-2" data-name={`order${o.id}Items`}>
              {o.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs" data-name={`order${o.id}Item${i}`}>
                  <span className="text-foreground-secondary">{item.productName} × {item.quantity}</span>
                  <span className="text-foreground-tertiary">
                    {item.pointsPrice > 0 ? `${item.pointsPrice} 积分` : `${item.price} 元`}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="text-xs text-foreground-tertiary" data-name={`order${o.id}Meta`}>
            {new Date(o.createdAt).toLocaleString('zh-CN')}
            {o.totalPoints > 0 && <span className="ml-3">总计: {o.totalPoints} 积分</span>}
            {o.totalAmount > 0 && <span className="ml-3">金额: ¥{o.totalAmount}</span>}
          </div>
        </div>
        );
      })}
    </div>
  );
}
