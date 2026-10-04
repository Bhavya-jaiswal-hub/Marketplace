import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Truck,
  RotateCcw,
  ShoppingBag,
  Shield,
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white text-slate-600 mt-24 border-t border-slate-200/80 shadow-[0_-1px_12px_rgba(0,0,0,0.02)]">
      {/* 4 Pillars Trust Strip */}
      <div className="bg-slate-50/90 border-b border-slate-200/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-950 font-heading">100% Curated & Verified</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Every artisan and workshop is physically audited & GST verified.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-950 font-heading">Razorpay Escrow Vault</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Funds release to makers only upon confirmed satisfactory delivery.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-800 flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-950 font-heading">Direct Vendor Dispatch</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Zero warehouse shelf-aging. Shipped straight from origin studios.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 flex-shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-950 font-heading">5-Day Express Returns</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Frictionless doorstep pickup with zero interrogation guarantees.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand & Mission Statement */}
          <div className="md:col-span-2 space-y-4 pr-0 md:pr-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-base font-extrabold text-slate-950 tracking-tight font-heading">
                VANGUARD MARKETPLACE
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              India&apos;s premier verified multi-vendor commerce pavilion. We bridge connoisseurs with master craftsmen, indie design studios, and sustainable indigenous manufacturers under institutional trust frameworks.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 px-3 py-1.5 rounded-lg w-fit">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Guaranteed Authentic Handcraft & Direct Sourcing</span>
            </div>
          </div>

          {/* Marketplace Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider font-heading">Marketplace</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/products" className="hover:text-brand-600 transition-colors">
                  Explore Catalog
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-brand-600 transition-colors">
                  Top Verified Sellers
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-brand-600 transition-colors">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-brand-600 transition-colors">
                  Daily Lightning Deals
                </Link>
              </li>
            </ul>
          </div>

          {/* For Vendors */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider font-heading">For Vendors</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/auth/register" className="hover:text-brand-600 transition-colors">
                  Become a Verified Seller
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-brand-600 transition-colors">
                  Seller Hub & Portal
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-brand-600 transition-colors">
                  Escrow Payout Schedule
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-brand-600 transition-colors">
                  Origin Logistics Network
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider font-heading">Customer Care</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/orders" className="hover:text-brand-600 transition-colors">
                  Track Live Shipment
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-brand-600 transition-colors">
                  5-Day Easy Returns
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-brand-600 transition-colors">
                  Escrow Protection FAQ
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-brand-600 transition-colors">
                  Buyer Rights & Claims
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment Partners & Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 font-mono">
            <span className="text-slate-800 font-bold font-heading">Payment Partners:</span>
            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold text-slate-700">UPI / BHIM</span>
            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold text-slate-700">Razorpay Escrow</span>
            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold text-slate-700">RuPay Platinum</span>
            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold text-slate-700">Visa & Mastercard</span>
            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold text-slate-700">NetBanking 50+</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
            <Link href="/products" className="hover:text-brand-600 transition-colors">Privacy Policy</Link>
            <Link href="/products" className="hover:text-brand-600 transition-colors">Terms of Service</Link>
            <Link href="/products" className="hover:text-brand-600 transition-colors">GST & Invoicing</Link>
          </div>
        </div>

        <div className="mt-6 text-center md:text-left text-xs text-slate-400">
          © {new Date().getFullYear()} Vanguard Marketplace India Pvt. Ltd. All rights reserved. Registered with Ministry of MSME, Govt. of India.
        </div>
      </div>
    </footer>
  );
};
