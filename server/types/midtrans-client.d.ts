declare module 'midtrans-client' {
  export interface MidtransClientOptions {
    isProduction?: boolean;
    serverKey: string;
    clientKey: string;
  }

  export interface SnapTransactionRequest {
    transaction_details: {
      order_id: string;
      gross_amount: number | string;
    };
    customer_details?: Record<string, any>;
    item_details?: Array<Record<string, any>>;
    enabled_payments?: string[];
    credit_card?: Record<string, any>;
    callbacks?: Record<string, any>;
    [key: string]: any;
  }

  export interface SnapTransactionResponse {
    token: string;
    redirect_url: string;
  }

  export class Snap {
    constructor(options: MidtransClientOptions);
    createTransaction(parameters: SnapTransactionRequest): Promise<SnapTransactionResponse>;
  }

  export class CoreApi {
    constructor(options: MidtransClientOptions);
    status(orderId: string): Promise<any>;
    capture(parameters: Record<string, any>): Promise<any>;
    charge(parameters: Record<string, any>): Promise<any>;
    cancel(orderId: string): Promise<any>;
  }

  const midtransClient: {
    Snap: typeof Snap;
    CoreApi: typeof CoreApi;
  };

  export default midtransClient;
}
