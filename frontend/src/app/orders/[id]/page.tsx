'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  CheckCircle2,
  Truck,
  ArrowLeft,
  MapPin,
  Check,
} from 'lucide-react';
import { orderService } from '@/lib/api';
import { Order } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

function OrderDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.id as string;
  const isSuccess = searchParams.get('success') === 'true';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrderDetail() {
      try {
        const data = await orderService.getOrderById(orderId);
        setOrder(data);
      } catch (err) {
        console.error('Failed to load order detail:', err);
      } finally {
        setLoading(false);
      }
    }
    if (orderId) loadOrderDetail();
  }, [orderId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-6">
        <div className="h-10 bg-slate-200 rounded-xl w-1/3 animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Order Not Found</h2>
        <Button asChild>
          <Link href="/orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

  const steps = [
    { label: 'Order Confirmed', status: 'CONFIRMED' },
    { label: 'Merchant Processing', status: 'PROCESSING' },
    { label: 'Shipped with Courier', status: 'SHIPPED' },
    { label: 'Delivered', status: 'DELIVERED' },
  ];

  const statusOrder = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const currentStepIndex = statusOrder.indexOf(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Success Banner if redirected from checkout */}
      {isSuccess && (
        <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-4 shadow-sm animate-in fade-in zoom-in-95">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold font-heading">Payment Verified & Order Confirmed!</h3>
            <p className="text-xs text-emerald-700 mt-0.5">
              Thank you for your purchase. We have notified our verified merchants to prepare your dispatch.
            </p>
          </div>
        </div>
      )}

      {/* Header & Back */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/orders" className="hover:text-brand-600 flex items-center gap-1 font-semibold">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Orders</span>
            </Link>
            <span>/</span>
            <span className="font-mono font-bold text-slate-900">{order.orderNumber}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-950 font-heading">
            Tracking Order #{order.orderNumber}
          </h1>
        </div>

        <Badge
          size="md"
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
      </div>

      {/* Fulfillment Stepper Timeline */}
      <div className="p-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Delivery Progress</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
          {steps.map((step, idx) => {
            const stepIndex = statusOrder.indexOf(step.status);
            const isCompleted = currentStepIndex >= stepIndex && order.status !== 'CANCELLED';
            const isCurrent = order.status === step.status;

            return (
              <div key={step.status} className="flex flex-col items-center text-center space-y-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : isCurrent
                      ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : idx + 1}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{step.label}</h4>
                  {isCurrent && <span className="text-[10px] font-semibold text-brand-600">In Progress</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Details & Delivery Address */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Shipping Address */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-brand-600" />
            <span>Delivery Destination</span>
          </h3>
          {order.shippingAddress ? (
            <div className="text-xs text-slate-700 leading-relaxed">
              <p className="font-bold text-slate-900">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                <span className="font-bold">{order.shippingAddress.postalCode}</span>
              </p>
              <p className="mt-2 text-slate-500">📞 {order.shippingAddress.phoneNumber}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Standard registered address</p>
          )}
        </div>

        {/* Payment Summary */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment Status</h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Method</span>
              <span className="font-semibold text-slate-900">Razorpay Secure</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Status</span>
              <Badge variant={order.paymentStatus === 'PAID' ? 'success' : 'warning'} size="sm">
                {order.paymentStatus}
              </Badge>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100 font-extrabold text-sm text-slate-950">
              <span>Total Paid</span>
              <span className="font-heading">₹{Number(order.totalAmount).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Courier Details */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-emerald-600" />
            <span>Courier Dispatch</span>
          </h3>
          <div className="space-y-1.5 text-xs text-slate-600">
            {order.items?.some((i) => i.trackingNumber) ? (
              order.items.map((item) =>
                item.trackingNumber ? (
                  <div key={item.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="font-bold text-slate-900 truncate">{item.productName}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Carrier: {item.courierCarrier || 'BlueDart'}</p>
                    <p className="text-[11px] font-mono text-brand-700 font-bold">AWB: {item.trackingNumber}</p>
                  </div>
                ) : null
              )
            ) : (
              <p className="text-slate-400 text-xs">Courier tracking numbers will update once seller dispatches.</p>
            )}
          </div>
        </div>
      </div>

      {/* Items Breakdown */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 font-heading">Items in this Order</h3>
        <div className="divide-y divide-slate-100">
          {order.items?.map((item) => (
            <div key={item.id} className="py-4 flex justify-between items-center gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 font-heading">{item.productName}</h4>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">SKU: {item.productSku}</p>
                <p className="text-xs text-slate-500 mt-1">
                  ₹{Number(item.productPrice).toLocaleString('en-IN')} × {item.quantity}
                </p>
              </div>

              <div className="text-right">
                <span className="text-sm font-extrabold text-slate-950 font-heading">
                  ₹{Number(item.totalPrice).toLocaleString('en-IN')}
                </span>
                <div>
                  <Badge variant="neutral" size="sm" className="mt-1">
                    {item.fulfillmentStatus}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto p-12 text-center text-sm font-bold text-slate-400">Loading order tracking...</div>}>
      <OrderDetailContent />
    </Suspense>
  );
}
