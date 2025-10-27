export const API_ENDPOINTS = {
  userSubscription: '/api/user/subscription',
  publicSubscriptionPackages: '/api/public/subscription-packages',
  userSubscriptionLimits: '/api/user/subscription-limits',
  paymentProcess: '/api/payment/process',
  paymentConfig: '/api/payment/config',
} as const;

export type ApiEndpointKey = keyof typeof API_ENDPOINTS;
