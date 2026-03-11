import { PaymentMethod } from '@prisma/client';
export interface CreatePaymentParams {
    /** Unique order ID from our system */
    orderId: string;
    /** Amount in the gateway's currency (VND for MoMo, USD cents for Stripe, etc.) */
    amount: number;
    /** Human-readable order description */
    orderInfo: string;
    /** URL to redirect user after payment */
    redirectUrl: string;
    /** URL for server-to-server IPN callback */
    ipnUrl: string;
    /** Any extra data to pass through (base64 encoded) */
    extraData?: string;
}
export interface GatewayPaymentResult {
    /** Whether the gateway accepted the request */
    success: boolean;
    /** URL to redirect the user to for payment */
    payUrl: string;
    /** Gateway-assigned order/transaction ID */
    gatewayOrderId: string;
    /** Our request ID echoed back */
    requestId: string;
    /** Raw response from gateway for debugging */
    rawResponse?: any;
}
export interface GatewayCallbackResult {
    /** Whether the payment was successful */
    success: boolean;
    /** Our original orderId */
    orderId: string;
    /** Amount that was paid */
    amount: number;
    /** Gateway-assigned transaction ID */
    transactionId: string;
    /** Human-readable message */
    message: string;
    /** Raw callback body for debugging */
    rawBody?: any;
}
export interface PaymentGateway {
    /** Human-readable name of this gateway */
    readonly name: string;
    /** Create a payment and return a URL for the user to pay */
    createPayment(params: CreatePaymentParams): Promise<GatewayPaymentResult>;
    /** Verify and parse an IPN/webhook callback from the gateway */
    verifyCallback(body: any): Promise<GatewayCallbackResult>;
}
export declare function registerGateway(method: PaymentMethod, gateway: PaymentGateway): void;
export declare function getGateway(method: PaymentMethod): PaymentGateway;
export declare function getAvailableGateways(): {
    method: PaymentMethod;
    name: string;
    available: boolean;
}[];
