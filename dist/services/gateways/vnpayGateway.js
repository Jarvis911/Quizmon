/**
 * VNPay Payment Gateway — Placeholder
 *
 * To implement:
 * 1. Register at https://sandbox.vnpayment.vn
 * 2. Add VNPAY_TMN_CODE, VNPAY_HASH_SECRET to .env
 * 3. Implement createPayment() using VNPay's redirect URL scheme
 * 4. Implement verifyCallback() for VNPay IPN
 */
export const vnpayGateway = {
    name: 'VNPay',
    async createPayment(_params) {
        throw new Error('VNPay payment gateway is not yet implemented. Coming soon!');
    },
    async verifyCallback(_body) {
        throw new Error('VNPay callback verification is not yet implemented.');
    },
};
