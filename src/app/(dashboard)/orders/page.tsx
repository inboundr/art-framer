'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Tabs components removed as they're not currently used
import { Input } from '@/components/ui/input';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Eye,
  Search,
  Filter,
  MapPin,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { FramePreview } from '@/components/FramePreview';

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

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  shipping_address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone?: string;
  };
  tracking_number?: string;
  estimated_delivery?: string;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
  dropship_orders?: Array<{
    id: string;
    provider: string;
    provider_order_id: string;
    status: string;
    tracking_number?: string;
    estimated_delivery?: string;
  }>;
}

export default function OrdersPage() {
  const { user, session } = useAuth(); // Use session from context instead of fetching
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Frontend: Fetching orders for user', user?.id);
      
      // Use session from auth context (already available, no need to fetch)
      // This avoids hanging on getSession() calls
      console.log('Frontend: Using session from context', { 
        hasSession: !!session, 
        hasToken: !!session?.access_token,
        userId: user?.id
      });
      
      // Make API call - cookie-based auth will work even without Authorization header
      // The API route checks cookies first (which are always sent with credentials: 'include')
      console.log('Frontend: Making fetch request to /api/orders...');
      console.log('Frontend: Request details', {
        url: '/api/orders',
        hasToken: !!session?.access_token,
        willUseCookies: true,
        credentials: 'include'
      });
      
      const response = await fetch('/api/orders', {
        credentials: 'include',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add Authorization header if available, but cookies will work too
          ...(session?.access_token && {
          'Authorization': `Bearer ${session.access_token}`
          })
        }
      });
      
      console.log('Frontend: Orders API response', { 
        status: response.status, 
        ok: response.ok 
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Frontend: Orders API error', errorData);
        throw new Error(`Failed to fetch orders: ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Frontend: Orders data received', { count: data.orders?.length || 0 });
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Frontend: Error fetching orders:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load orders. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, session, toast]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, fetchOrders]);

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
      case 'processing':
        return <Package className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.shipping_address.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.shipping_address.state.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const OrderCard = ({ order }: { order: Order }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(order.status)}
              <div>
                <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {formatDate(order.created_at)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(order.status)}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedOrder(order)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Order Items Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {order.order_items.slice(0, 2).map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="flex-shrink-0">
                  <FramePreview
                    imageUrl={item.products.images.image_url || item.products.images.thumbnail_url}
                    imagePrompt={item.products.images.prompt}
                    frameSize={item.products.frame_size}
                    frameStyle={item.products.frame_style}
                    frameMaterial={item.products.frame_material}
                    price={item.total_price}
                    showDetails={false}
                    showWallContext={false}
                    className="w-20 h-20"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">
                    {item.products.frame_size.replace('x', '×')} Frame
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    &ldquo;{item.products.images.prompt}&rdquo;
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Qty: {item.quantity} × {formatPrice(item.unit_price)}
                  </p>
                </div>
              </div>
            ))}
            {order.order_items.length > 2 && (
              <div className="text-sm text-muted-foreground">
                +{order.order_items.length - 2} more items
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{order.shipping_address.city}, {order.shipping_address.state}</span>
              </div>
              {order.tracking_number && (
                <div className="flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  <span>Tracking: {order.tracking_number}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="font-semibold text-lg">
                {formatPrice(order.total_amount)}
              </div>
              {order.estimated_delivery && (
                <div className="text-xs text-muted-foreground">
                  Est. delivery: {formatDate(order.estimated_delivery)}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const OrderDetailsModal = ({ order }: { order: Order }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[90]">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Order #{order.order_number}</h2>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              Close
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Items */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Order Items</h3>
              {order.order_items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <FramePreview
                          imageUrl={item.products.images.image_url || item.products.images.thumbnail_url}
                          imagePrompt={item.products.images.prompt}
                          frameSize={item.products.frame_size}
                          frameStyle={item.products.frame_style}
                          frameMaterial={item.products.frame_material}
                          price={item.total_price}
                          showDetails={true}
                          showWallContext={true}
                          className="w-32"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {item.products.frame_size.replace('x', '×')} Frame
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          &ldquo;{item.products.images.prompt}&rdquo;
                        </p>
                        <div className="text-sm space-y-1">
                          <div>Quantity: {item.quantity}</div>
                          <div>Unit Price: {formatPrice(item.unit_price)}</div>
                          <div className="font-semibold">Total: {formatPrice(item.total_price)}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Order Information</h3>
              
              {/* Status */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(order.status)}
                    <span className="font-medium">Status</span>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Shipping Address</span>
                  </div>
                  <div className="text-sm">
                    <div>{order.shipping_address.line1}</div>
                    {order.shipping_address.line2 && <div>{order.shipping_address.line2}</div>}
                    <div>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</div>
                    <div>{order.shipping_address.country}</div>
                    {order.shipping_address.phone && <div>{order.shipping_address.phone}</div>}
                  </div>
                </CardContent>
              </Card>

              {/* Tracking Information */}
              {(order.tracking_number || order.estimated_delivery) && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-4 w-4" />
                      <span className="font-medium">Shipping Information</span>
                    </div>
                    <div className="text-sm space-y-1">
                      {order.tracking_number && (
                        <div>Tracking Number: {order.tracking_number}</div>
                      )}
                      {order.estimated_delivery && (
                        <div>Estimated Delivery: {formatDate(order.estimated_delivery)}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Order Summary */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="font-medium">Order Summary</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatPrice(order.total_amount * 0.92)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>{formatPrice(order.total_amount * 0.08)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Total:</span>
                      <span>{formatPrice(order.total_amount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in to view your orders</h1>
            <p className="text-muted-foreground">You need to be logged in to track your orders.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Orders</h1>
            <p className="text-muted-foreground">Track and manage your orders</p>
          </div>
          <Button onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number, city, or state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No orders found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'You haven\'t placed any orders yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

        {/* Order Details Modal */}
        {selectedOrder && <OrderDetailsModal order={selectedOrder} />}
      </div>
    </AuthenticatedLayout>
  );
}
