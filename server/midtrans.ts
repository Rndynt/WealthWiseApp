import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import type { Snap } from 'midtrans-client';

type MidtransClientModule = typeof import('midtrans-client');

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY;
const MIDTRANS_MERCHANT_ID = process.env.MIDTRANS_MERCHANT_ID;
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

let snapInstance: Snap | null = null;
let midtransModule: MidtransClientModule | null = null;

const requireModule = createRequire(import.meta.url);

function ensureMidtransModule(): MidtransClientModule {
  if (!midtransModule) {
    try {
      const required = requireModule('midtrans-client') as
        | MidtransClientModule
        | { default: MidtransClientModule };

      midtransModule =
        required && typeof required === 'object' && 'default' in required
          ? required.default
          : (required as MidtransClientModule);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError?.code === 'MODULE_NOT_FOUND' || nodeError?.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(
          "Midtrans dependency 'midtrans-client' is missing. Install it with `npm install midtrans-client` to enable Midtrans payments."
        );
      }

      throw error;
    }
  }

  return midtransModule!;
}

function ensureConfigured(): void {
  if (!MIDTRANS_SERVER_KEY || !MIDTRANS_CLIENT_KEY || !MIDTRANS_MERCHANT_ID) {
    throw new Error('Midtrans configuration is incomplete. Please set MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY, and MIDTRANS_MERCHANT_ID.');
  }
}

export function getMidtransSnap(): Snap {
  ensureConfigured();

  if (!snapInstance) {
    const midtransClient = ensureMidtransModule();

    snapInstance = new midtransClient.Snap({
      isProduction: MIDTRANS_IS_PRODUCTION,
      serverKey: MIDTRANS_SERVER_KEY!,
      clientKey: MIDTRANS_CLIENT_KEY!,
    });
  }

  return snapInstance;
}

export function getMidtransConfig() {
  return {
    merchantId: MIDTRANS_MERCHANT_ID ?? null,
    clientKey: MIDTRANS_CLIENT_KEY ?? null,
    isProduction: MIDTRANS_IS_PRODUCTION,
    snapScriptUrl: MIDTRANS_IS_PRODUCTION
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js',
    isConfigured: Boolean(MIDTRANS_SERVER_KEY && MIDTRANS_CLIENT_KEY && MIDTRANS_MERCHANT_ID),
  } as const;
}

export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}): boolean {
  if (!MIDTRANS_SERVER_KEY) {
    return false;
  }

  const payload = `${params.orderId}${params.statusCode}${params.grossAmount}${MIDTRANS_SERVER_KEY}`;
  const expectedSignature = crypto.createHash('sha512').update(payload).digest('hex');
  return expectedSignature === params.signatureKey;
}

export function isMidtransConfigured(): boolean {
  if (!MIDTRANS_SERVER_KEY || !MIDTRANS_CLIENT_KEY || !MIDTRANS_MERCHANT_ID) {
    return false;
  }

  try {
    ensureMidtransModule();
    return true;
  } catch {
    return false;
  }
}
