// ─── Registry ───────────────────────────────────────────────────────
const gatewayRegistry = new Map();
export function registerGateway(method, gateway) {
    gatewayRegistry.set(method, gateway);
}
export function getGateway(method) {
    const gw = gatewayRegistry.get(method);
    if (!gw) {
        throw new Error(`Payment gateway "${method}" is not registered or not yet implemented.`);
    }
    return gw;
}
export function getAvailableGateways() {
    const allMethods = ['MOMO', 'VNPAY', 'STRIPE', 'MOCK'];
    return allMethods.map(method => ({
        method,
        name: gatewayRegistry.get(method)?.name ?? method,
        available: gatewayRegistry.has(method),
    }));
}
