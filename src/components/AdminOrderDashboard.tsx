import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  Edit, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  tracking_number?: string;
  tracking_url?: string;
  estimated_delivery_date?: string;
  dropship_provider?: string;
  dropship_status?: string;
  provider_order_id?: string;
}

interface OrderDetails {
  order: Order;
  statusHistory: any[];
  orderLogs: any[];
  dropshipOrders: any[];
  prodigiStatus: any;
}

export function AdminOrderDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [editOrderOpen, setEditOrderOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
    hasMore: false,
  });
  const [editForm, setEditForm] = useState({
    status: '',
    trackingNumber: '',
    trackingUrl: '',
    estimatedDelivery: '',
    notes: '',
  });
  const { toast } = useToast();

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-green-100 text-green-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
  };

  const statusIcons = {
    pending: Clock,
    paid: CheckCircle,
    processing: Package,
    shipped: Truck,
    delivered: CheckCircle,
    cancelled: XCircle,
    refunded: AlertCircle,
  };

  useEffect(() => {
    fetchOrders();
  }, [filters, pagination.offset]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());

      const response = await fetch(`/api/orders/management?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        hasMore: data.pagination.hasMore,
      }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      setSelectedOrder(data);
      setOrderDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch order details',
        variant: 'destructive',
      });
    }
  };

  const refreshProdigiStatus = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'refresh_prodigi_status' }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh Prodigi status');
      }

      const data = await response.json();
      toast({
        title: 'Success',
        description: 'Prodigi status refreshed successfully',
      });

      // Refresh order details if open
      if (selectedOrder && selectedOrder.order.id === orderId) {
        fetchOrderDetails(orderId);
      }
    } catch (error) {
      console.error('Error refreshing Prodigi status:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh Prodigi status',
        variant: 'destructive',
      });
    }
  };

  const updateOrder = async () => {
    if (!selectedOrder) return;

    try {
      const response = await fetch('/api/orders/management', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          orderId: selectedOrder.order.id,
          status: editForm.status,
          trackingNumber: editForm.trackingNumber,
          trackingUrl: editForm.trackingUrl,
          estimatedDelivery: editForm.estimatedDelivery,
          notes: editForm.notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      toast({
        title: 'Success',
        description: 'Order updated successfully',
      });

      setEditOrderOpen(false);
      fetchOrders();
      fetchOrderDetails(selectedOrder.order.id);
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (order: Order) => {
    setEditForm({
      status: order.status,
      trackingNumber: order.tracking_number || '',
      trackingUrl: order.tracking_url || '',
      estimatedDelivery: order.estimated_delivery_date ? new Date(order.estimated_delivery_date).toISOString().split('T')[0] : '',
      notes: '',
    });
    setEditOrderOpen(true);
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-gray-600">Manage and track customer orders</p>
        </div>
        <Button onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Order number, email..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading orders...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Dropship</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const StatusIcon = statusIcons[order.status as keyof typeof statusIcons] || Clock;
                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.order_number}</div>
                            <div className="text-sm text-gray-500">#{order.id.slice(-8)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customer_name || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{order.customer_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(order.total_amount, order.currency)}
                        </TableCell>
                        <TableCell>{formatDate(order.created_at)}</TableCell>
                        <TableCell>
                          {order.tracking_number ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{order.tracking_number}</span>
                              {order.tracking_url && (
                                <a
                                  href={order.tracking_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">No tracking</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.dropship_provider && (
                            <div>
                              <Badge variant="outline">{order.dropship_provider}</Badge>
                              {order.dropship_status && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {order.dropship_status}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => fetchOrderDetails(order.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(order)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {order.dropship_provider === 'prodigi' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => refreshProdigiStatus(order.id)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={orderDetailsOpen} onOpenChange={setOrderDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Order Information</h3>
                  <p>Order Number: {selectedOrder.order.order_number}</p>
                  <p>Status: {selectedOrder.order.status}</p>
                  <p>Total: {formatCurrency(selectedOrder.order.total_amount, selectedOrder.order.currency)}</p>
                  <p>Created: {formatDate(selectedOrder.order.created_at)}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Customer Information</h3>
                  <p>Name: {selectedOrder.order.customer_name}</p>
                  <p>Email: {selectedOrder.order.customer_email}</p>
                </div>
              </div>

              {/* Prodigi Status */}
              {selectedOrder.prodigiStatus && (
                <div>
                  <h3 className="font-semibold">Prodigi Status</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p>Status: {selectedOrder.prodigiStatus.status}</p>
                    {selectedOrder.prodigiStatus.trackingNumber && (
                      <p>Tracking: {selectedOrder.prodigiStatus.trackingNumber}</p>
                    )}
                    {selectedOrder.prodigiStatus.estimatedDelivery && (
                      <p>Estimated Delivery: {new Date(selectedOrder.prodigiStatus.estimatedDelivery).toLocaleDateString()}</p>
                    )}
                    <p>Last Updated: {new Date(selectedOrder.prodigiStatus.lastUpdated).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Status History */}
              <div>
                <h3 className="font-semibold">Status History</h3>
                <div className="space-y-2">
                  {selectedOrder.statusHistory.map((status, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Badge>{status.status}</Badge>
                      <span>{formatDate(status.created_at)}</span>
                      {status.reason && <span className="text-gray-500">- {status.reason}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Logs */}
              <div>
                <h3 className="font-semibold">Order Logs</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedOrder.orderLogs.map((log, index) => (
                    <div key={index} className="text-sm border-l-2 border-gray-200 pl-2">
                      <div className="font-medium">{log.action}</div>
                      <div className="text-gray-500">{formatDate(log.created_at)}</div>
                      {log.details && (
                        <div className="text-xs text-gray-600 mt-1">
                          {JSON.stringify(log.details, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={editOrderOpen} onOpenChange={setEditOrderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-tracking">Tracking Number</Label>
              <Input
                id="edit-tracking"
                value={editForm.trackingNumber}
                onChange={(e) => setEditForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-tracking-url">Tracking URL</Label>
              <Input
                id="edit-tracking-url"
                value={editForm.trackingUrl}
                onChange={(e) => setEditForm(prev => ({ ...prev, trackingUrl: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-delivery">Estimated Delivery</Label>
              <Input
                id="edit-delivery"
                type="date"
                value={editForm.estimatedDelivery}
                onChange={(e) => setEditForm(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes about this order..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOrderOpen(false)}>
                Cancel
              </Button>
              <Button onClick={updateOrder}>
                Update Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
