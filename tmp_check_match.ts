import prisma from './src/prismaClient.js';

async function main() {
    try {
        const match = await prisma.match.findUnique({
            where: { id: 6 },
            include: {
                quiz: true,
                host: true,
            }
        });
        if (match) {
            console.log("MATCH_FOUND");
            console.log(JSON.stringify(match, null, 2));
        } else {
            console.log("MATCH_NOT_FOUND");
        }
    } catch (error) {
        console.error("ERROR", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
