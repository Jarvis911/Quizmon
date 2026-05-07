import { PaymentGateway } from './paymentGateway.js';
/**
 * VNPay Payment Gateway — Placeholder
 *
 * To implement:
 * 1. Register at https://sandbox.vnpayment.vn
 * 2. Add VNPAY_TMN_CODE, VNPAY_HASH_SECRET to .env
 * 3. Implement createPayment() using VNPay's redirect URL scheme
 * 4. Implement verifyCallback() for VNPay IPN
 */
export declare const vnpayGateway: PaymentGateway;
