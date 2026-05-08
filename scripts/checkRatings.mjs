import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const quizzes = await prisma.quiz.count();
  const ratings = await prisma.quizRating.count();
  const top = await prisma.quizRating.groupBy({
    by: ['quizId'],
    _avg: { rating: true },
    _count: { _all: true },
  });

  const top5 = [...top]
    .sort((a, b) => (b._count?._all ?? 0) - (a._count?._all ?? 0))
    .slice(0, 5);

  console.log(JSON.stringify({ quizzes, ratings, top: top5 }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

