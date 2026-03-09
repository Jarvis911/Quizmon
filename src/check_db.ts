import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Listing all quiz IDs:');
    const quizzes = await prisma.quiz.findMany({
        select: { id: true, title: true }
    });
    console.log('Quizzes:', quizzes);
    
    const count = await prisma.quiz.count();
    console.log('Total quizzes:', count);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
