import { PrismaClient, QuestionType, MediaType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seed started...');

    // 1. Create Users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@quizmon.com',
            password: hashedPassword
        },
    });

    const player1 = await prisma.user.upsert({
        where: { username: 'player1' },
        update: {},
        create: {
            username: 'player1',
            email: 'player1@quizmon.com',
            password: hashedPassword,
        },
    });

    console.log('Users created:', { admin: admin.username, player1: player1.username });

    // 2. Create Categories
    const science = await prisma.quizCategory.create({
        data: { name: 'Science' },
    });

    const history = await prisma.quizCategory.create({
        data: { name: 'History' },
    });

    const sports = await prisma.quizCategory.create({
        data: { name: 'Sports' },
    });

    console.log('Categories created:', [science.name, history.name, sports.name]);

    // 3. Create a Science Quiz
    const scienceQuiz = await prisma.quiz.create({
        data: {
            title: 'General Science Quiz',
            description: 'Test your knowledge of basic science concepts.',
            isPublic: true,
            creatorId: admin.id,
            categoryId: science.id,
        },
    });

    // 4. Create Questions for Science Quiz

    // -- BUTTONS Question --
    const q1 = await prisma.question.create({
        data: {
            text: 'What is the chemical symbol for Gold?',
            type: QuestionType.BUTTONS,
            quizId: scienceQuiz.id,
            button: { create: {} },
            options: {
                create: [
                    { text: 'Au', isCorrect: true },
                    { text: 'Ag', isCorrect: false },
                    { text: 'Fe', isCorrect: false },
                    { text: 'Hg', isCorrect: false },
                ],
            },
        },
    });

    // -- CHECKBOXES Question --
    const q2 = await prisma.question.create({
        data: {
            text: 'Which of the following are noble gases?',
            type: QuestionType.CHECKBOXES,
            quizId: scienceQuiz.id,
            checkbox: { create: {} },
            options: {
                create: [
                    { text: 'Helium', isCorrect: true },
                    { text: 'Neon', isCorrect: true },
                    { text: 'Oxygen', isCorrect: false },
                    { text: 'Nitrogen', isCorrect: false },
                ],
            },
        },
    });

    // -- RANGE Question --
    const q3 = await prisma.question.create({
        data: {
            text: 'What is the boiling point of water in Celsius at sea level?',
            type: QuestionType.RANGE,
            quizId: scienceQuiz.id,
            range: {
                create: {
                    minValue: 0,
                    maxValue: 200,
                    correctValue: 100,
                },
            },
        },
    });

    // -- REORDER Question --
    const q4 = await prisma.question.create({
        data: {
            text: 'Order these planets from the Sun:',
            type: QuestionType.REORDER,
            quizId: scienceQuiz.id,
            reorder: { create: {} },
            options: {
                create: [
                    { text: 'Mercury', order: 1 },
                    { text: 'Venus', order: 2 },
                    { text: 'Earth', order: 3 },
                    { text: 'Mars', order: 4 },
                ],
            },
        },
    });

    // -- TYPEANSWER Question --
    const q5 = await prisma.question.create({
        data: {
            text: 'What is the largest planet in our solar system?',
            type: QuestionType.TYPEANSWER,
            quizId: scienceQuiz.id,
            typeAnswer: {
                create: {
                    correctAnswer: 'Jupiter',
                },
            },
        },
    });

    // -- LOCATION Question --
    const q6 = await prisma.question.create({
        data: {
            text: 'Find the location of the Eiffel Tower.',
            type: QuestionType.LOCATION,
            quizId: scienceQuiz.id,
            location: {
                create: {
                    correctLatitude: 48.8584,
                    correctLongitude: 2.2945,
                },
            },
        },
    });

    // -- Media Example --
    await prisma.questionMedia.create({
        data: {
            type: MediaType.IMAGE,
            url: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Eiffel_Tower_at_Night.jpg',
            questionId: q6.id,
        }
    });

    console.log('Science Quiz and Questions created.');

    // 5. Create a History Quiz
    const historyQuiz = await prisma.quiz.create({
        data: {
            title: 'World War II History',
            description: 'Test your knowledge on the major events of WWII.',
            isPublic: true,
            creatorId: admin.id,
            categoryId: history.id,
        },
    });

    await prisma.question.create({
        data: {
            text: 'In which year did WWII end?',
            type: QuestionType.BUTTONS,
            quizId: historyQuiz.id,
            button: { create: {} },
            options: {
                create: [
                    { text: '1945', isCorrect: true },
                    { text: '1944', isCorrect: false },
                    { text: '1946', isCorrect: false },
                    { text: '1939', isCorrect: false },
                ],
            },
        },
    });

    console.log('History Quiz created.');

    console.log('Seed finished successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
