import swaggerJsdoc from 'swagger-jsdoc';
import { BACKEND_URL } from './index.js';
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'QuizMon API',
            version: '1.0.0',
            description: 'REST API documentation for QuizMon - A full stack quiz application',
        },
        servers: [
            {
                url: BACKEND_URL,
                description: 'Local server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts'], // Path to the API docs
};
const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
