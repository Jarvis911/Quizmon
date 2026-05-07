import cors from 'cors';
// - Omit allowedHeaders so preflight echoes Access-Control-Request-Headers.
// - origin: true reflects the request Origin (Access-Control-Allow-Origin: <origin> + Vary: Origin).
//   Some mobile Safari / proxy setups behave better than a bare "*".
const corsMiddleware = cors({
    origin: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    maxAge: 86400,
    optionsSuccessStatus: 204,
});
export default corsMiddleware;
