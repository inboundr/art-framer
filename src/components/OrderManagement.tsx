'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Eye,
  Download,
  RefreshCw,
  MapPin,
  CreditCard,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: {
    id: string;
    frame_size: string;
    frame_style: string;
    frame_material: string;
    price: number;
    images: {
      id: string;
      prompt: string;
      image_url: string;
      thumbnail_url: string;
    };
  };
}

interface DropshipOrder {
  id: string;
  order_id: string;
  order_item_id: string;
  provider: string;
  provider_order_id: string;
  status: string;
  tracking_number: string;
  tracking_url: string;
  estimated_delivery: string;
  actual_delivery: string;
  shipping_cost: number;
  provider_response: any;
  created_at: string;
  updated_at: string;
}

interface Order {
  id: string;
  user_id: string;
  order_number: string;
  stripe_payment_intent_id: string;
  stripe_session_id: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: any;
  billing_address: any;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
  dropship_orders: DropshipOrder[];
}

interface OrderManagementProps {
  userId?: string;
}

export function OrderManagement({ userId }: OrderManagementProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/orders?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <Package className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
      case 'refunded':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-purple-100 text-purple-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFrameSizeLabel = (size: string) => {
    const labels = {
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
      extra_large: 'Extra Large',
    };
    return labels[size as keyof typeof labels] || size;
  };

  const getFrameStyleLabel = (style: string) => {
    return style.charAt(0).toUpperCase() + style.slice(1);
  };

  const getFrameMaterialLabel = (material: string) => {
    return material.charAt(0).toUpperCase() + material.slice(1);
  };

  const handleRefresh = () => {
    fetchOrders();
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleDownloadInvoice = (order: Order) => {
    // TODO: Implement invoice download
    toast({
      title: 'Invoice Download',
      description: 'Invoice download feature coming soon.',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Orders</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={fetchOrders}>Try Again</Button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
        <p className="text-gray-500 mb-4">
          {statusFilter === 'all' 
            ? "You haven't placed any orders yet." 
            : `No orders found with status: ${statusFilter}`
          }
        </p>
        {statusFilter !== 'all' && (
          <Button variant="outline" onClick={() => setStatusFilter('all')}>
            View All Orders
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Order Management</h2>
          <p className="text-gray-600">Track and manage your orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
                  <p className="text-sm text-gray-600">
                    Placed on {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusColor(order.status)} flex items-center gap-1`}>
                    {getStatusIcon(order.status)}
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewOrder(order)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Order Items */}
                <div>
                  <h4 className="font-medium mb-2">Items ({order.order_items.length})</h4>
                  <div className="space-y-2">
                    {order.order_items.slice(0, 2).map((item) => (
                      <div key={item.id} className="flex gap-2">
                        <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden">
                          <img
                            src={item.products.images.thumbnail_url}
                            alt={item.products.images.prompt}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">
                            {getFrameSizeLabel(item.products.frame_size)} Frame
                          </p>
                          <p className="text-xs text-gray-600">
                            {getFrameStyleLabel(item.products.frame_style)} {getFrameMaterialLabel(item.products.frame_material)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {order.order_items.length > 2 && (
                      <p className="text-xs text-gray-500">
                        +{order.order_items.length - 2} more items
                      </p>
                    )}
                  </div>
                </div>

                {/* Shipping Info */}
                <div>
                  <h4 className="font-medium mb-2">Shipping</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="line-clamp-1">
                        {order.shipping_address?.city}, {order.shipping_address?.state}
                      </span>
                    </div>
                    {order.dropship_orders.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        <span>
                          {order.dropship_orders[0].tracking_number 
                            ? `Tracking: ${order.dropship_orders[0].tracking_number}`
                            : 'Processing'
                          }
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Total */}
                <div>
                  <h4 className="font-medium mb-2">Total</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>{formatPrice(order.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span>{formatPrice(order.shipping_amount)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Total:</span>
                      <span>{formatPrice(order.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
          <div className="flex h-full">
            <div className="flex-1 bg-white overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Order #{selectedOrder.order_number}</h2>
                    <p className="text-gray-600">
                      Placed on {formatDate(selectedOrder.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getStatusColor(selectedOrder.status)} flex items-center gap-1`}>
                      {getStatusIcon(selectedOrder.status)}
                      {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                    </Badge>
                    <Button
                      variant="outline"
                      onClick={() => handleDownloadInvoice(selectedOrder)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Invoice
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedOrder(null)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Order Items */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Items</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedOrder.order_items.map((item) => (
                        <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                            <img
                              src={item.products.images.thumbnail_url}
                              alt={item.products.images.prompt}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">
                              {getFrameSizeLabel(item.products.frame_size)} Frame
                            </h4>
                            <p className="text-sm text-gray-600">
                              {getFrameStyleLabel(item.products.frame_style)} {getFrameMaterialLabel(item.products.frame_material)}
                            </p>
                            <p className="text-sm text-gray-500 line-clamp-2">
                              &ldquo;{item.products.images.prompt}&rdquo;
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-sm">Qty: {item.quantity}</span>
                              <span className="font-medium">
                                {formatPrice(item.total_price)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Order Details */}
                  <div className="space-y-6">
                    {/* Shipping Address */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-5 w-5" />
                          Shipping Address
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          <p>{selectedOrder.customer_name}</p>
                          <p>{selectedOrder.shipping_address?.address1}</p>
                          {selectedOrder.shipping_address?.address2 && (
                            <p>{selectedOrder.shipping_address.address2}</p>
                          )}
                          <p>
                            {selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state} {selectedOrder.shipping_address?.zip}
                          </p>
                          <p>{selectedOrder.shipping_address?.country}</p>
                          {selectedOrder.customer_phone && (
                            <p>{selectedOrder.customer_phone}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Order Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>{formatPrice(selectedOrder.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax:</span>
                          <span>{formatPrice(selectedOrder.tax_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Shipping:</span>
                          <span>{formatPrice(selectedOrder.shipping_amount)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-lg border-t pt-2">
                          <span>Total:</span>
                          <span>{formatPrice(selectedOrder.total_amount)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Tracking Info */}
                    {selectedOrder.dropship_orders.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5" />
                            Tracking Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {selectedOrder.dropship_orders.map((dropship) => (
                            <div key={dropship.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium capitalize">
                                  {dropship.provider} Order
                                </span>
                                <Badge className={getStatusColor(dropship.status)}>
                                  {dropship.status}
                                </Badge>
                              </div>
                              {dropship.tracking_number && (
                                <div className="space-y-1 text-sm">
                                  <p>
                                    <strong>Tracking:</strong> {dropship.tracking_number}
                                  </p>
                                  {dropship.tracking_url && (
                                    <a
                                      href={dropship.tracking_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline"
                                    >
                                      Track Package →
                                    </a>
                                  )}
                                  {dropship.estimated_delivery && (
                                    <p>
                                      <strong>Estimated Delivery:</strong>{' '}
                                      {formatDate(dropship.estimated_delivery)}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
