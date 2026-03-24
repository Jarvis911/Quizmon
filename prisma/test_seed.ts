import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const categories = await prisma.quizCategory.findMany({
        orderBy: { id: 'asc' }
    });
    console.log('Categories in DB:');
    categories.forEach(c => console.log(`${c.id}: ${c.name}`));
}

main().finally(() => prisma.$disconnect());
