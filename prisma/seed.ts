import { PrismaClient, QuestionType, MediaType, PlanType, FeatureKey, ImageEffect } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Bắt đầu quy trình seed dữ liệu hợp nhất (Tiếng Việt)...');

    // 1. Tạo Người dùng (Users)
    const hashedPassword = await bcrypt.hash('password123', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@quizmon.com' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@quizmon.com',
            password: hashedPassword,
            isAdmin: true,
            bio: 'Quản trị viên hệ thống Quizmon.',
        },
    });

    const teacher = await prisma.user.upsert({
        where: { email: 'giaovien@quizmon.vn' },
        update: {},
        create: {
            username: 'giaovien_vn',
            email: 'giaovien@quizmon.vn',
            password: hashedPassword,
            bio: 'Giáo viên tâm huyết, yêu thích sáng tạo nội dung giáo dục.',
        },
    });

    console.log('Đã tạo người dùng:', { admin: admin.username, teacher: teacher.username });

    // 2. Tạo Danh mục (Categories) theo đúng thứ tự yêu cầu
    const categoryNames = [
        'Nghệ thuật',
        'Giải trí',
        'Địa lý',
        'Lịch sử',
        'Ngôn ngữ',
        'Khoa học',
        'Thể thao',
        'Đố vui'
    ];

    const categories: any = {};

    for (const name of categoryNames) {
        // Tìm xem danh mục đã tồn tại chưa để tránh trùng lặp nếu seed lại
        let category = await prisma.quizCategory.findFirst({
            where: { name: name }
        });

        if (!category) {
            category = await prisma.quizCategory.create({
                data: { name: name },
            });
        }
        categories[name] = category;
    }

    console.log('Đã tạo/kiểm tra các danh mục theo thứ tự:', categoryNames.join(', '));

    // 3. Tạo Quiz mẫu cho từng danh mục

    // --- 3.1 Nghệ thuật ---
    const quizArt = await prisma.quiz.create({
        data: {
            title: 'Danh họa và Tác phẩm kinh điển',
            description: 'Kiểm tra kiến thức về các họa sĩ nổi tiếng và những bức tranh huyền thoại thế giới.',
            isPublic: true,
            creatorId: teacher.id,
            categoryId: categories['Nghệ thuật'].id,
        },
    });

    await prisma.question.create({
        data: {
            text: 'Ai là tác giả của bức tranh "Mona Lisa"?',
            type: QuestionType.BUTTONS,
            quizId: quizArt.id,
            options: {
                create: [
                    { text: 'Leonardo da Vinci', isCorrect: true },
                    { text: 'Vincent van Gogh', isCorrect: false },
                    { text: 'Pablo Picasso', isCorrect: false },
                    { text: 'Claude Monet', isCorrect: false },
                ],
            },
        },
    });

    // --- 3.2 Giải trí ---
    const quizEnt = await prisma.quiz.create({
        data: {
            title: 'Thế giới Điện ảnh & Âm nhạc',
            description: 'Những câu hỏi thú vị về các bộ phim bom tấn và nghệ sĩ nổi tiếng.',
            isPublic: true,
            creatorId: teacher.id,
            categoryId: categories['Giải trí'].id,
        },
    });

    await prisma.question.create({
        data: {
            text: 'Giải thưởng cao quý nhất của điện ảnh thế giới là giải gì?',
            type: QuestionType.BUTTONS,
            quizId: quizEnt.id,
            options: {
                create: [
                    { text: 'Oscar', isCorrect: true },
                    { text: 'Grammy', isCorrect: false },
                    { text: 'Emmy', isCorrect: false },
                    { text: 'Golden Globe', isCorrect: false },
                ],
            },
        },
    });

    // --- 3.3 Địa lý ---
    const quizGeo = await prisma.quiz.create({
        data: {
            title: 'Khám phá Việt Nam và Thế giới',
            description: 'Kiến thức về các địa danh, núi non và sông ngòi hùng vĩ.',
            isPublic: true,
            creatorId: teacher.id,
            categoryId: categories['Địa lý'].id,
        },
    });

    const qGeoLoc = await prisma.question.create({
        data: {
            text: 'Hãy xác định vị trí của Vịnh Hạ Long trên bản đồ.',
            type: QuestionType.LOCATION,
            quizId: quizGeo.id,
            data: { correctLatitude: 20.9101, correctLongitude: 107.1839 },
        },
    });

    await prisma.questionMedia.create({
        data: {
            type: MediaType.IMAGE,
            url: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Ha_Long_Bay_Beautiful_Sunset.jpg',
            questionId: qGeoLoc.id,
        }
    });

    // --- 3.4 Lịch sử ---
    const quizHis = await prisma.quiz.create({
        data: {
            title: 'Hào khí Việt Nam qua các thời đại',
            description: 'Tìm hiểu về các cột mốc lịch sử quan trọng của dân tộc Việt Nam.',
            isPublic: true,
            creatorId: teacher.id,
            categoryId: categories['Lịch sử'].id,
        },
    });

    await prisma.question.create({
        data: {
            text: 'Chiến thắng Điện Biên Phủ "lừng lẫy năm châu, chấn động địa cầu" diễn ra vào năm nào?',
            type: QuestionType.BUTTONS,
            quizId: quizHis.id,
            options: {
                create: [
                    { text: '1954', isCorrect: true },
                    { text: '1945', isCorrect: false },
                    { text: '1975', isCorrect: false },
                    { text: '1930', isCorrect: false },
                ],
            },
        },
    });

    // --- 3.5 Ngôn ngữ ---
    const quizLang = await prisma.quiz.create({
        data: {
            title: 'Phong ba bão táp không bằng ngữ pháp Việt Nam',
            description: 'Kiểm tra khả năng sử dụng tiếng Việt và các thành ngữ, tục ngữ.',
            isPublic: true,
            creatorId: teacher.id,
            categoryId: categories['Ngôn ngữ'].id,
        },
    });

    await prisma.question.create({
        data: {
            text: 'Điền từ còn thiếu vào câu thành ngữ: "Học đi đôi với ..."',
            type: QuestionType.TYPEANSWER,
            quizId: quizLang.id,
            data: { correctAnswer: 'hành' },
        },
    });

    // --- 3.6 Khoa học ---
    const quizSci = await prisma.quiz.create({
        data: {
            title: 'Khoa học thường thức & Vũ trụ',
            description: 'Khám phá các quy luật tự nhiên và bí ẩn của không gian.',
            isPublic: true,
            creatorId: admin.id,
            categoryId: categories['Khoa học'].id,
        },
    });

    await prisma.question.create({
        data: {
            text: 'Hành tinh nào gần Mặt trời nhất?',
            type: QuestionType.BUTTONS,
            quizId: quizSci.id,
            options: {
                create: [
                    { text: 'Sao Thủy', isCorrect: true },
                    { text: 'Sao Kim', isCorrect: false },
                    { text: 'Trái Đất', isCorrect: false },
                    { text: 'Sao Hỏa', isCorrect: false },
                ],
            },
        },
    });

    // --- 3.7 Thể thao ---
    const quizSport = await prisma.quiz.create({
        data: {
            title: 'Đam mê Thể thao',
            description: 'Cùng tìm hiểu về các bộ môn thể thao phổ biến và các huyền thoại.',
            isPublic: true,
            creatorId: teacher.id,
            categoryId: categories['Thể thao'].id,
        },
    });

    await prisma.question.create({
        data: {
            text: 'Một trận đấu bóng đá chính thức (không tính bù giờ và hiệp phụ) kéo dài bao nhiêu phút?',
            type: QuestionType.BUTTONS,
            quizId: quizSport.id,
            options: {
                create: [
                    { text: '90 phút', isCorrect: true },
                    { text: '45 phút', isCorrect: false },
                    { text: '100 phút', isCorrect: false },
                    { text: '60 phút', isCorrect: false },
                ],
            },
        },
    });

    // --- 3.8 Đố vui ---
    const quizTrivia = await prisma.quiz.create({
        data: {
            title: 'Câu đố dân gian & Đố mẹo',
            description: 'Những câu đố vui giúp thư giãn và rèn luyện tư duy nhạy bén.',
            isPublic: true,
            creatorId: teacher.id,
            categoryId: categories['Đố vui'].id,
        },
    });

    await prisma.question.create({
        data: {
            text: 'Con gì chân ngắn, mà lại có màng, mỏ bẹt màu vàng, hay kêu cạp cạp?',
            type: QuestionType.BUTTONS,
            quizId: quizTrivia.id,
            options: {
                create: [
                    { text: 'Con vịt', isCorrect: true },
                    { text: 'Con gà', isCorrect: false },
                    { text: 'Con chó', isCorrect: false },
                    { text: 'Con mèo', isCorrect: false },
                ],
            },
        },
    });

    console.log('Đã tạo các Quiz mẫu cho từng danh mục.');

    // 4. Tạo Gói SaaS (SaaS Plans)
    console.log('Seeding SaaS plans...');
    const plans = [
        {
            type: PlanType.FREE,
            name: 'Miễn phí',
            description: 'Hoàn hảo để bắt đầu trải nghiệm.',
            priceMonthly: 0,
            priceYearly: 0,
            isActive: true,
            features: [
                { featureKey: FeatureKey.UNLIMITED_MATCHES, limit: 5, enabled: true },
                { featureKey: FeatureKey.AI_GENERATION, limit: 3, enabled: true },
                { featureKey: FeatureKey.MAX_PLAYERS_PER_MATCH, limit: 10, enabled: true },
                { featureKey: FeatureKey.MAX_CLASSROOMS, limit: 1, enabled: true },
                { featureKey: FeatureKey.MAX_STUDENTS_PER_CLASSROOM, limit: 10, enabled: true },
            ],
        },
        {
            type: PlanType.TEACHER_PRO,
            name: 'Giáo viên',
            description: 'Công cụ nâng cao cho giáo viên cá nhân.',
            priceMonthly: 99000,
            priceYearly: 990000,
            isActive: true,
            features: [
                { featureKey: FeatureKey.UNLIMITED_MATCHES, limit: null, enabled: true },
                { featureKey: FeatureKey.AI_GENERATION, limit: 50, enabled: true },
                { featureKey: FeatureKey.MAX_PLAYERS_PER_MATCH, limit: 50, enabled: true },
                { featureKey: FeatureKey.MAX_CLASSROOMS, limit: 10, enabled: true },
                { featureKey: FeatureKey.MAX_STUDENTS_PER_CLASSROOM, limit: 50, enabled: true },
            ],
        },
        {
            type: PlanType.SCHOOL,
            name: 'Trường học',
            description: 'Tốt nhất cho các khoa hoặc tổ chức giáo dục.',
            priceMonthly: 499000,
            priceYearly: 4990000,
            isActive: true,
            features: [
                { featureKey: FeatureKey.UNLIMITED_MATCHES, limit: null, enabled: true },
                { featureKey: FeatureKey.AI_GENERATION, limit: 500, enabled: true },
                { featureKey: FeatureKey.MAX_PLAYERS_PER_MATCH, limit: 200, enabled: true },
                { featureKey: FeatureKey.MAX_CLASSROOMS, limit: 50, enabled: true },
                { featureKey: FeatureKey.MAX_STUDENTS_PER_CLASSROOM, limit: 100, enabled: true },
            ],
        },
        {
            type: PlanType.ENTERPRISE,
            name: 'Doanh nghiệp',
            description: 'Dành cho các cơ sở giáo dục quy mô lớn.',
            priceMonthly: 1999000,
            priceYearly: 19990000,
            isActive: true,
            features: [
                { featureKey: FeatureKey.UNLIMITED_MATCHES, limit: null, enabled: true },
                { featureKey: FeatureKey.AI_GENERATION, limit: null, enabled: true },
                { featureKey: FeatureKey.MAX_PLAYERS_PER_MATCH, limit: 1000, enabled: true },
                { featureKey: FeatureKey.MAX_CLASSROOMS, limit: 500, enabled: true },
                { featureKey: FeatureKey.MAX_STUDENTS_PER_CLASSROOM, limit: 1000, enabled: true },
            ],
        },
    ];

    for (const p of plans) {
        const { features, ...planData } = p;
        const plan = await prisma.plan.upsert({
            where: { type: p.type },
            update: planData,
            create: planData,
        });

        for (const f of features) {
            await prisma.planFeature.upsert({
                where: {
                    planId_featureKey: {
                        planId: plan.id,
                        featureKey: f.featureKey,
                    },
                },
                update: f,
                create: { ...f, planId: plan.id },
            });
        }
    }

    console.log('Đã cập nhật các gói SaaS và tính năng.');
    console.log('Hoàn thành seed dữ liệu thành công!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
