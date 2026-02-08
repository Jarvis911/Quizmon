import swaggerAutogen from 'swagger-autogen';

interface SwaggerDoc {
    info: {
        title: string;
        description: string;
    };
    host: string;
    schemes: string[];
}

const doc: SwaggerDoc = {
    info: {
        title: 'Quiz API',
        description: 'API documentation for Quiz App',
    },
    host: 'localhost:5000',
    schemes: ['http'],
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['../server.ts'];

swaggerAutogen()(outputFile, endpointsFiles, doc);
