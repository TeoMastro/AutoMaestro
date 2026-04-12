import Stripe from 'stripe';
import { SubscriptionTier } from '@/lib/constants';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
  typescript: true,
});

export const STRIPE_CONFIG = {
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
};

/**
 * Maps a Stripe Price ID to the internal subscription tier.
 * Uses NEXT_PUBLIC_ env vars so this mapping works on both client and server.
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier | null {
  const mapping: Record<string, SubscriptionTier> = {
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_FREELANCER_MONTHLY!]: 'freelancer',
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_FREELANCER_ANNUAL!]: 'freelancer',
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_MONTHLY!]: 'agency',
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_ANNUAL!]: 'agency',
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_SCALE_MONTHLY!]: 'scale',
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_SCALE_ANNUAL!]: 'scale',
  };

  return mapping[priceId] ?? null;
}
