'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, ShieldCheck, Clock, ArrowRight, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { orderService } from '@/lib/api';
import { Order } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

export default function OrdersPage() {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Return Request Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnOrderItemId, setReturnOrderItemId] = useState('');
  const [returnItemName, setReturnItemName] = useState('');
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState('DEFECTIVE_PRODUCT');
  const [returnSuccessMessage, setReturnSuccessMessage] = useState('');
  const [returnErrorMessage, setReturnErrorMessage] = useState('');

  useEffect(() => {
    async function loadOrders() {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      try {
        const list = await orderService.getMyOrders();
        setOrders(list || []);
      } catch (err) {
        console.error('Failed to load customer orders:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, [isAuthenticated]);

  const handleOpenReturn = (orderItemId: string, itemName: string, maxQty: number) => {
    setReturnOrderItemId(orderItemId);
    setReturnItemName(itemName);
    setReturnQuantity(1);
    setReturnErrorMessage('');
    setReturnSuccessMessage('');
    setIsReturnModalOpen(true);
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await orderService.requestReturn({
        orderItemId: returnOrderItemId,
        returnQuantity,
        reason: returnReason,
      });
      setReturnSuccessMessage('Return request submitted successfully! Super Admin will review it shortly.');
      setTimeout(() => {
        setIsReturnModalOpen(false);
      }, 2000);
    } catch (err: any) {
      setReturnErrorMessage(err?.response?.data?.message || 'Failed to submit return request.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <Package className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Sign in to view your orders</h2>
        <p className="text-xs text-slate-500">Access order tracking, courier updates, and 5-day return requests.</p>
        <Button asChild>
          <Link href="/auth/login?redirect=/orders">Sign In</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-950 font-heading">My Orders & Returns</h1>
        <p className="text-xs text-slate-500 mt-1">
          Track fulfillment status, courier carriers, and initiate 5-day return requests
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">No orders placed yet</h3>
          <p className="text-xs text-slate-500">Explore products from verified sellers and place your first order!</p>
          <Button asChild size="sm">
            <Link href="/products">Explore Marketplace</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm"
            >
              {/* Order Card Header */}
              <div className="p-5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Order #</span>
                    <span className="text-xs font-bold text-slate-900 font-mono">{order.orderNumber}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Amount</p>
                    <p className="text-sm font-extrabold text-slate-950 font-heading">
                      ₹{Number(order.totalAmount).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <Badge
                    variant={
                      order.status === 'DELIVERED'
                        ? 'success'
                        : order.status === 'CANCELLED'
                        ? 'danger'
                        : 'info'
                    }
                  >
                    {order.status}
                  </Badge>

                  <Button variant="outline" size="sm" asChild className="rounded-lg">
                    <Link href={`/orders/${order.id}`}>
                      <span>Track</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Order Items */}
              <div className="divide-y divide-slate-100 p-5 space-y-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 pt-4 first:pt-0">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 font-heading">{item.productName}</h4>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span className="font-mono">SKU: {item.productSku}</span>
                        <span>Qty: {item.quantity}</span>
                        <span>₹{Number(item.productPrice).toLocaleString('en-IN')} each</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Fulfillment Status */}
                      <Badge
                        variant={
                          item.fulfillmentStatus === 'DELIVERED'
                            ? 'success'
                            : item.fulfillmentStatus === 'SHIPPED'
                            ? 'info'
                            : 'neutral'
                        }
                      >
                        {item.fulfillmentStatus}
                      </Badge>

                      {/* 5-Day Return Action on Delivered Items */}
                      {item.fulfillmentStatus === 'DELIVERED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReturn(item.id, item.productName, item.quantity)}
                          className="gap-1.5 text-xs text-slate-700"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-brand-600" />
                          <span>Request Return</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Return Request Modal */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Request Item Return (5-Day Window)"
      >
        <form onSubmit={handleSubmitReturn} className="space-y-4">
          <p className="text-xs text-slate-600">
            Requesting return for: <span className="font-bold text-slate-900">{returnItemName}</span>
          </p>

          {returnSuccessMessage ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              <span>{returnSuccessMessage}</span>
            </div>
          ) : (
            <>
              {returnErrorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{returnErrorMessage}</span>
                </div>
              )}

              <Input
                type="number"
                label="Return Quantity *"
                min={1}
                value={returnQuantity}
                onChange={(e) => setReturnQuantity(Number(e.target.value))}
                required
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Reason for Return *
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-800"
                >
                  <option value="DEFECTIVE_PRODUCT">Defective / Non-functional Product</option>
                  <option value="WRONG_ITEM">Received Wrong Item / Variant</option>
                  <option value="NOT_AS_DESCRIBED">Item Does Not Match Description</option>
                  <option value="DAMAGED_TRANSIT">Damaged during shipping transit</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                ℹ️ Once approved by Super Admin, physical courier pickup will be scheduled. Full refund is processed upon return inspection acceptance.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsReturnModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit Return Request</Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
