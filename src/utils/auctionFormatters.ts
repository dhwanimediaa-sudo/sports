/**
 * SportsPulse - Auction Formatter Utilities
 */

import { AuctionCurrency } from '../types';

/**
 * Format currency amount cleanly (e.g. ₹20 Lakh, ₹1.50 Cr, $500,000)
 */
export function formatAuctionAmount(amount: number, currency: AuctionCurrency = 'INR'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0';
  }

  if (currency === 'INR') {
    if (amount >= 10000000) {
      const cr = amount / 10000000;
      return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      const lakh = amount / 100000;
      return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(2)} Lakh`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  const symbolMap: Record<AuctionCurrency, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'AED ',
    AUD: 'A$',
  };

  const symbol = symbolMap[currency] || '$';

  if (amount >= 1000000) {
    const m = amount / 1000000;
    return `${symbol}${m % 1 === 0 ? m.toFixed(0) : m.toFixed(2)}M`;
  }
  if (amount >= 1000) {
    const k = amount / 1000;
    return `${symbol}${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }

  return `${symbol}${amount.toLocaleString()}`;
}

/**
 * Format exact INR with Indian number commas: e.g. ₹ 2,50,000 / ₹ 10,00,000
 */
export function formatINR(amount: number): string {
  const valid = Number(amount) || 0;
  return `₹ ${valid.toLocaleString('en-IN')}`;
}

/**
 * Get category badge color scheme
 */
export function getCategoryBadgeColor(category: string): { bg: string; text: string; border: string } {
  switch (category?.toUpperCase()) {
    case 'ICON':
    case 'MARQUEE':
      return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/40' };
    case 'A':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40' };
    case 'B':
      return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/40' };
    case 'C':
      return { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/40' };
    case 'EMERGING':
    case 'UNCAPPED':
      return { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/40' };
    case 'OVERSEAS':
      return { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/40' };
    default:
      return { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
  }
}

/**
 * Get player status badge styling
 */
export function getPlayerStatusBadge(status: string): { label: string; bg: string; text: string; border: string } {
  switch (status) {
    case 'SOLD':
      return { label: 'SOLD', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/50' };
    case 'UNSOLD':
      return { label: 'UNSOLD', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/50' };
    case 'RETAINED':
      return { label: 'RETAINED', bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/50' };
    case 'IN_AUCTION':
      return { label: 'LIVE BIDDING', bg: 'bg-amber-500/20 animate-pulse', text: 'text-amber-400', border: 'border-amber-500/60' };
    case 'AVAILABLE':
      return { label: 'AVAILABLE', bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
    default:
      return { label: status || 'DRAFT', bg: 'bg-slate-900', text: 'text-slate-400', border: 'border-slate-800' };
  }
}

/**
 * Get auction status badge styling
 */
export function getAuctionStatusBadge(status: string): { label: string; bg: string; text: string; dotColor: string } {
  switch (status) {
    case 'LIVE':
      return { label: 'LIVE AUCTION', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50', text: 'text-emerald-400', dotColor: 'bg-emerald-400 animate-ping' };
    case 'PAUSED':
      return { label: 'PAUSED', bg: 'bg-amber-950/80 text-amber-300 border-amber-500/50', text: 'text-amber-400', dotColor: 'bg-amber-400' };
    case 'READY':
      return { label: 'READY', bg: 'bg-blue-950/80 text-blue-300 border-blue-500/50', text: 'text-blue-400', dotColor: 'bg-blue-400' };
    case 'COMPLETED':
      return { label: 'COMPLETED', bg: 'bg-purple-950/80 text-purple-300 border-purple-500/50', text: 'text-purple-400', dotColor: 'bg-purple-400' };
    case 'CANCELLED':
      return { label: 'CANCELLED', bg: 'bg-rose-950/80 text-rose-300 border-rose-500/50', text: 'text-rose-400', dotColor: 'bg-rose-400' };
    default:
      return { label: 'DRAFT', bg: 'bg-slate-900 text-slate-400 border-slate-700', text: 'text-slate-400', dotColor: 'bg-slate-500' };
  }
}
