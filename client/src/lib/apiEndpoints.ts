export const API_ENDPOINTS = {
  userSubscription: '/api/user/subscription',
  publicSubscriptionPackages: '/api/public/subscription-packages',
  paymentProcess: '/api/payment/process',
} as const;

export type ApiEndpointKey = keyof typeof API_ENDPOINTS;
