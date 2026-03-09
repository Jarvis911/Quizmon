import crypto from 'crypto';
import { PaymentGateway, CreatePaymentParams, GatewayPaymentResult, GatewayCallbackResult } from './paymentGateway.js';

// ─── MoMo Config ────────────────────────────────────────────────────

const MOMO_PARTNER_CODE = process.env.MOMO_PARTNER_CODE || 'MOMO';
const MOMO_ACCESS_KEY = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
const MOMO_SECRET_KEY = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
const MOMO_API_URL = process.env.MOMO_API_URL || 'https://test-payment.momo.vn';

// ─── Helpers ────────────────────────────────────────────────────────

function createSignature(rawSignature: string): string {
    return crypto
        .createHmac('sha256', MOMO_SECRET_KEY)
        .update(rawSignature)
        .digest('hex');
}

// ─── MoMo Gateway Implementation ───────────────────────────────────

export const momoGateway: PaymentGateway = {
    name: 'MoMo',

    async createPayment(params: CreatePaymentParams): Promise<GatewayPaymentResult> {
        const requestId = `${MOMO_PARTNER_CODE}_${Date.now()}`;
        const requestType = 'payWithMethod';
        const lang = 'vi';
        const autoCapture = true;
        const extraData = params.extraData || '';

        // Build raw signature string (alphabetical order as required by MoMo)
        const rawSignature = [
            `accessKey=${MOMO_ACCESS_KEY}`,
            `amount=${params.amount}`,
            `extraData=${extraData}`,
            `ipnUrl=${params.ipnUrl}`,
            `orderId=${params.orderId}`,
            `orderInfo=${params.orderInfo}`,
            `partnerCode=${MOMO_PARTNER_CODE}`,
            `redirectUrl=${params.redirectUrl}`,
            `requestId=${requestId}`,
            `requestType=${requestType}`,
        ].join('&');

        const signature = createSignature(rawSignature);

        const requestBody = {
            partnerCode: MOMO_PARTNER_CODE,
            partnerName: 'Quizmon',
            storeId: 'QuizmonStore',
            requestId,
            amount: params.amount,
            orderId: params.orderId,
            orderInfo: params.orderInfo,
            redirectUrl: params.redirectUrl,
            ipnUrl: params.ipnUrl,
            lang,
            requestType,
            autoCapture,
            extraData,
            signature,
        };

        console.log('[MoMo] Creating payment:', {
            orderId: params.orderId,
            amount: params.amount,
            requestId,
        });

        const response = await fetch(`${MOMO_API_URL}/v2/gateway/api/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        console.log('[MoMo] Response:', {
            resultCode: data.resultCode,
            message: data.message,
            payUrl: data.payUrl ? '✓' : '✗',
        });

        if (data.resultCode !== 0) {
            throw new Error(`MoMo payment creation failed: ${data.message} (code: ${data.resultCode})`);
        }

        return {
            success: true,
            payUrl: data.payUrl,
            gatewayOrderId: data.orderId,
            requestId: data.requestId,
            rawResponse: data,
        };
    },

    async verifyCallback(body: any): Promise<GatewayCallbackResult> {
        // Rebuild signature from callback params to verify authenticity
        const rawSignature = [
            `accessKey=${MOMO_ACCESS_KEY}`,
            `amount=${body.amount}`,
            `extraData=${body.extraData || ''}`,
            `message=${body.message}`,
            `orderId=${body.orderId}`,
            `orderInfo=${body.orderInfo}`,
            `orderType=${body.orderType}`,
            `partnerCode=${body.partnerCode}`,
            `payType=${body.payType}`,
            `requestId=${body.requestId}`,
            `responseTime=${body.responseTime}`,
            `resultCode=${body.resultCode}`,
            `transId=${body.transId}`,
        ].join('&');

        const expectedSignature = createSignature(rawSignature);

        if (expectedSignature !== body.signature) {
            console.error('[MoMo IPN] Signature mismatch!', {
                expected: expectedSignature,
                received: body.signature,
            });
            throw new Error('MoMo IPN signature verification failed');
        }

        console.log('[MoMo IPN] Verified callback:', {
            orderId: body.orderId,
            resultCode: body.resultCode,
            transId: body.transId,
        });

        return {
            success: body.resultCode === 0,
            orderId: body.orderId,
            amount: Number(body.amount),
            transactionId: String(body.transId),
            message: body.message,
            rawBody: body,
        };
    },
};
