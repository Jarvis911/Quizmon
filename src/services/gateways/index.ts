/**
 * Gateway Registry — Auto-registers all available payment gateways.
 * Import this file once at app startup to register all gateways.
 */
import { PaymentMethod } from '@prisma/client';
import { registerGateway } from './paymentGateway.js';
import { momoGateway } from './momoGateway.js';
// Uncomment these when implemented:
// import { vnpayGateway } from './vnpayGateway.js';
// import { stripeGateway } from './stripeGateway.js';

// Register active gateways
registerGateway(PaymentMethod.MOMO, momoGateway);

// Placeholder gateways — uncomment when implemented:
// registerGateway(PaymentMethod.VNPAY, vnpayGateway);
// registerGateway(PaymentMethod.STRIPE, stripeGateway);

console.log('[PaymentGateway] Registered gateways: MOMO');
