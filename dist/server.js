import http from 'http';
import app from './app.js';
import { initializeSocket } from './socket/index.js';
// docker compose run app npx prisma migrate dev --name init
// node swagger.js
import { PORT } from './config/index.js';
const server = http.createServer(app);
// Initialize Socket.IO with modular handlers
initializeSocket(server).then(() => {
    server.listen(PORT, () => {
        console.log(`Socket + server has running on ${PORT}`);
    });
}).catch((err) => {
    console.error('Failed to initialize socket:', err);
});
