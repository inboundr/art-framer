import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin, 
  ExternalLink,
  RefreshCw,
  Bell,
} from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  tracking_number?: string;
  tracking_url?: string;
  estimated_delivery_date?: string;
  customer_email: string;
  customer_name?: string;
  shipping_address?: any;
}

interface OrderDetails {
  order: Order;
  statusHistory: any[];
  orderLogs: any[];
  dropshipOrders: any[];
  prodigiStatus: any;
}

interface CustomerOrderTrackingProps {
  orderId?: string;
  showAllOrders?: boolean;
}

export function CustomerOrderTracking({ orderId, showAllOrders = false }: CustomerOrderTrackingProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  const statusConfig = {
    pending: {
      label: 'Order Placed',
      description: 'Your order has been received and is being processed.',
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-800',
      progress: 10,
    },
    paid: {
      label: 'Payment Confirmed',
      description: 'Your payment has been processed successfully.',
      icon: CheckCircle,
      color: 'bg-blue-100 text-blue-800',
      progress: 25,
    },
    processing: {
      label: 'Processing',
      description: 'Your order is being prepared for shipping.',
      icon: Package,
      color: 'bg-purple-100 text-purple-800',
      progress: 50,
    },
    shipped: {
      label: 'Shipped',
      description: 'Your order is on its way to you.',
      icon: Truck,
      color: 'bg-green-100 text-green-800',
      progress: 75,
    },
    delivered: {
      label: 'Delivered',
      description: 'Your order has been delivered successfully.',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800',
      progress: 100,
    },
    cancelled: {
      label: 'Cancelled',
      description: 'Your order has been cancelled.',
      icon: Clock,
      color: 'bg-red-100 text-red-800',
      progress: 0,
    },
  };

  const fetchAllOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders/management', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch your orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchOrderDetails = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${id}/status`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      setSelectedOrder(data);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch order details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (showAllOrders) {
      fetchAllOrders();
    } else if (orderId) {
      fetchOrderDetails(orderId);
    }
    fetchNotifications();
  }, [orderId, showAllOrders, fetchAllOrders, fetchOrderDetails]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const markNotificationsAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ notificationIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }

      fetchNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusProgress = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig]?.progress || 0;
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading order information...
      </div>
    );
  }

  if (showAllOrders) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Orders</h1>
            <p className="text-gray-600">Track your order history and status</p>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-600">{unreadCount} unread notifications</span>
            </div>
          )}
        </div>

        {/* Orders List */}
        <div className="grid gap-4">
          {orders.map((order) => {
            const config = getStatusConfig(order.status);
            const StatusIcon = config.icon;
            
            return (
              <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-gray-100">
                        <StatusIcon className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{order.order_number}</h3>
                        <p className="text-gray-600">{formatDate(order.created_at)}</p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(order.total_amount, order.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={config.color}>
                        {config.label}
                      </Badge>
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchOrderDetails(order.id)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>Order Progress</span>
                      <span>{config.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${config.progress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  if (!selectedOrder) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Order Found</h3>
        <p className="text-gray-600">Unable to find the requested order.</p>
      </div>
    );
  }

  const order = selectedOrder.order;
  const config = getStatusConfig(order.status);
  const StatusIcon = config.icon;

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{order.order_number}</CardTitle>
              <p className="text-gray-600">Order placed on {formatDate(order.created_at)}</p>
            </div>
            <Badge className={`${config.color} text-lg px-4 py-2`}>
              <StatusIcon className="h-5 w-5 mr-2" />
              {config.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Order Total</h4>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(order.total_amount, order.currency)}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Status</h4>
              <p className="text-gray-600">{config.description}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Customer</h4>
              <p className="text-gray-600">{order.customer_name || order.customer_email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Order Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="relative">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Order Progress</span>
                <span>{config.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${config.progress}%` }}
                />
              </div>
            </div>

            {/* Status Steps */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              {Object.entries(statusConfig).map(([status, statusConfig]) => {
                const isActive = getStatusProgress(status) <= config.progress;
                const isCurrent = status === order.status;
                const Icon = statusConfig.icon;
                
                return (
                  <div
                    key={status}
                    className={`text-center p-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-50 text-gray-400'
                    } ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <Icon className={`h-6 w-6 mx-auto mb-2 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    <p className="text-xs font-medium">{statusConfig.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tracking Information */}
      {order.tracking_number && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Tracking Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Tracking Number</h4>
                <p className="text-lg font-mono bg-gray-100 p-2 rounded">
                  {order.tracking_number}
                </p>
              </div>
              
              {order.tracking_url && (
                <div>
                  <Button asChild>
                    <a
                      href={order.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Track Package
                    </a>
                  </Button>
                </div>
              )}

              {order.estimated_delivery_date && (
                <div>
                  <h4 className="font-semibold mb-2">Estimated Delivery</h4>
                  <p className="text-gray-600">
                    {new Date(order.estimated_delivery_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipping Address */}
      {order.shipping_address && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-gray-600">
              <p>{order.shipping_address.line1}</p>
              {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
              <p>
                {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
              </p>
              <p>{order.shipping_address.country}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prodigi Status */}
      {selectedOrder.prodigiStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Production Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Status</h4>
                  <p className="text-gray-600">{selectedOrder.prodigiStatus.status}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Last Updated</h4>
                  <p className="text-gray-600">
                    {new Date(selectedOrder.prodigiStatus.lastUpdated).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {selectedOrder.prodigiStatus.trackingNumber && (
                <div className="mt-4">
                  <h4 className="font-semibold">Production Tracking</h4>
                  <p className="text-gray-600">{selectedOrder.prodigiStatus.trackingNumber}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status History */}
      {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Status History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedOrder.statusHistory.map((status, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 rounded-full bg-white">
                    <StatusIcon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{status.status}</p>
                    <p className="text-sm text-gray-600">{formatDate(status.created_at)}</p>
                    {status.reason && (
                      <p className="text-sm text-gray-500 mt-1">{status.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
