import { PrismaClient, PlanType, FeatureKey, MatchMode, MemberStatus, ClassroomRole, QuestionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type SeedUser = { id: number; email: string; username: string | null };

const SEED_PASSWORD = 'password123';

function slugify(input: string): string {
    return input
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function stableJoinCode(): string {
    return '482913';
}

function stableInviteToken(): string {
    return 'inv_8f3a2c1d9b0e4f7a';
}

async function upsertUser(email: string, username: string, overrides?: Partial<{ isAdmin: boolean; bio: string }>): Promise<SeedUser> {
    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            username,
            ...(overrides?.bio !== undefined ? { bio: overrides.bio } : {}),
            ...(overrides?.isAdmin !== undefined ? { isAdmin: overrides.isAdmin } : {}),
        },
        create: {
            email,
            username,
            password: hashedPassword,
            ...(overrides?.bio !== undefined ? { bio: overrides.bio } : {}),
            ...(overrides?.isAdmin !== undefined ? { isAdmin: overrides.isAdmin } : {}),
        },
        select: { id: true, email: true, username: true },
    });
    return user;
}

async function upsertCategoriesInOrder(names: string[]) {
    const categories: Record<string, { id: number; name: string }> = {};
    for (const name of names) {
        const existing = await prisma.quizCategory.findFirst({ where: { name }, select: { id: true, name: true } });
        if (existing) {
            categories[name] = existing;
            continue;
        }
        const created = await prisma.quizCategory.create({ data: { name }, select: { id: true, name: true } });
        categories[name] = created;
    }
    return categories;
}

type SeedQuestion =
    | {
          type: 'BUTTONS' | 'CHECKBOXES' | 'REORDER';
          text: string;
          options: Array<{ text: string; isCorrect?: boolean; order?: number }>;
      }
    | {
          type: 'TYPEANSWER';
          text: string;
          data: { correctAnswer: string };
      }
    | {
          type: 'LOCATION';
          text: string;
          data: { correctLatitude: number; correctLongitude: number };
      };

async function createQuizWithQuestions(args: {
    creatorId: number;
    categoryId: number;
    title: string;
    description: string;
    image?: string | null;
    isPublic?: boolean;
    questions: SeedQuestion[];
}) {
    if (args.questions.length < 4) {
        throw new Error(`Seed quiz "${args.title}" must have at least 4 questions.`);
    }

    const quiz = await prisma.quiz.create({
        data: {
            title: args.title,
            description: args.description,
            image: args.image ?? null,
            isPublic: args.isPublic ?? true,
            creatorId: args.creatorId,
            categoryId: args.categoryId,
        },
        select: { id: true, title: true },
    });

    for (const q of args.questions) {
        if (q.type === 'BUTTONS' || q.type === 'CHECKBOXES') {
            await prisma.question.create({
                data: {
                    quizId: quiz.id,
                    text: q.text,
                    type: q.type as QuestionType,
                    options: { create: q.options.map(o => ({ text: o.text, isCorrect: !!o.isCorrect })) },
                },
            });
        } else if (q.type === 'REORDER') {
            await prisma.question.create({
                data: {
                    quizId: quiz.id,
                    text: q.text,
                    type: q.type as QuestionType,
                    options: {
                        create: q.options.map((o, idx) => ({
                            text: o.text,
                            order: o.order ?? idx + 1,
                            isCorrect: null,
                        })),
                    },
                },
            });
        } else {
            await prisma.question.create({
                data: {
                    quizId: quiz.id,
                    text: q.text,
                    type: q.type as QuestionType,
                    data: (q as any).data as any,
                },
            });
        }
    }

    return quiz;
}

async function seedPlansAndPromotions() {
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
                { featureKey: FeatureKey.AI_IMAGE_GENERATION, limit: 0, enabled: false },
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
                { featureKey: FeatureKey.AI_IMAGE_GENERATION, limit: 20, enabled: true },
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
                { featureKey: FeatureKey.AI_IMAGE_GENERATION, limit: 100, enabled: true },
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
                { featureKey: FeatureKey.AI_IMAGE_GENERATION, limit: null, enabled: true },
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

    console.log('Seeding promotions...');
    const teacherPlan = await prisma.plan.findUnique({ where: { type: PlanType.TEACHER_PRO } });
    if (teacherPlan) {
        await prisma.promotion.deleteMany({
            where: { title: 'Gói Giáo Viên - MIỄN PHÍ! 🎉' },
        });
        await prisma.promotion.create({
            data: {
                title: 'Gói Giáo Viên - MIỄN PHÍ! 🎉',
                subtitle: 'Ưu đãi đặc biệt cho giáo viên — áp dụng đến hết khóa luận',
                description:
                    'Nhân dịp ra mắt nền tảng Quizmon, chúng tôi tặng miễn phí gói Giáo Viên. Trải nghiệm hệ thống ngay hôm nay!',
                planId: teacherPlan.id,
                discountedPriceMonthly: 0,
                discountedPriceYearly: 0,
                expiresAt: new Date('2026-12-31T23:59:59.000Z'),
                isActive: true,
                isPublished: true,
                bannerColor: '#0078D4',
                badgeText: 'MIỄN PHÍ',
            },
        });
    }
}

async function seedClassroom(args: {
    teacherId: number;
    studentUsers: SeedUser[];
}) {
    const joinCode = stableJoinCode();
    const inviteLink = stableInviteToken();

    const classroom = await prisma.classroom.upsert({
        where: { joinCode },
        update: {
            name: 'Lớp 10A1',
            description: 'Lớp học thực nghiệm Quizmon.',
            inviteLink,
            teacherId: args.teacherId,
        },
        create: {
            name: 'Lớp 10A1',
            description: 'Lớp học thực nghiệm Quizmon.',
            joinCode,
            inviteLink,
            teacherId: args.teacherId,
        },
        select: { id: true, name: true, joinCode: true },
    });

    await prisma.expectedStudent.deleteMany({ where: { classroomId: classroom.id } });
    await prisma.expectedStudent.createMany({
        data: args.studentUsers.slice(0, 8).map((u, idx) => ({
            classroomId: classroom.id,
            name: `Học sinh ${idx + 1}`,
            studentCode: `HS${String(idx + 1).padStart(4, '0')}`,
            email: u.email,
            matchedUserId: u.id,
        })),
    });

    await prisma.classroomMember.upsert({
        where: { classroomId_userId: { classroomId: classroom.id, userId: args.teacherId } },
        update: { role: ClassroomRole.TEACHER, status: MemberStatus.APPROVED },
        create: { classroomId: classroom.id, userId: args.teacherId, role: ClassroomRole.TEACHER, status: MemberStatus.APPROVED },
    });

    for (let i = 0; i < args.studentUsers.length; i++) {
        const u = args.studentUsers[i];
        const approved = i < 8; 
        await prisma.classroomMember.upsert({
            where: { classroomId_userId: { classroomId: classroom.id, userId: u.id } },
            update: { role: ClassroomRole.STUDENT, status: approved ? MemberStatus.APPROVED : MemberStatus.PENDING },
            create: { classroomId: classroom.id, userId: u.id, role: ClassroomRole.STUDENT, status: approved ? MemberStatus.APPROVED : MemberStatus.PENDING },
        });
    }

    return classroom;
}

async function seedHomeworkAndRatings(args: {
    teacherId: number;
    classroomId: number;
    quizzes: Array<{ id: number; title: string }>;
    students: SeedUser[];
}) {
    const now = new Date();

    const homeworkQuizzes = args.quizzes.slice(0, 2);
    for (let i = 0; i < homeworkQuizzes.length; i++) {
        const q = homeworkQuizzes[i];
        const homeworkPin = `HW${args.classroomId}-${i + 1}`;
        await prisma.matchResult.deleteMany({ where: { match: { pin: homeworkPin } } });
        await prisma.match.deleteMany({ where: { pin: homeworkPin } });
        const match = await prisma.match.create({
            data: {
                pin: homeworkPin,
                quizId: q.id,
                hostId: args.teacherId,
                mode: MatchMode.HOMEWORK,
                classroomId: args.classroomId,
                deadline: new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000),
                strictMode: false,
            },
            select: { id: true, quizId: true },
        });

        const submitters = args.students.slice(0, 6);
        for (const s of submitters) {
            await prisma.matchResult.create({
                data: {
                    matchId: match.id,
                    userId: s.id,
                    score: 500 + Math.floor(Math.random() * 500),
                },
            });
        }
    }

    const raters = args.students.slice(0, 12);
    for (const quiz of args.quizzes) {
        const ratingPin = `RT${args.teacherId}-Q${quiz.id}`;
        await prisma.matchResult.deleteMany({ where: { match: { pin: ratingPin } } });
        await prisma.match.deleteMany({ where: { pin: ratingPin } });
        const match = await prisma.match.create({
            data: {
                pin: ratingPin,
                quizId: quiz.id,
                hostId: args.teacherId,
                mode: MatchMode.REALTIME,
                startTime: now,
                endTime: now,
                strictMode: false,
            },
            select: { id: true, quizId: true },
        });

        for (const u of raters) {
            await prisma.matchResult.create({
                data: {
                    matchId: match.id,
                    userId: u.id,
                    score: 300 + Math.floor(Math.random() * 700),
                },
            });

            const ratingValue = randomFrom([3, 4, 4, 5, 5]);
            const exists = await prisma.quizRating.findFirst({ where: { quizId: quiz.id, userId: u.id }, select: { id: true } });
            if (!exists) {
                await prisma.quizRating.create({
                    data: {
                        quizId: quiz.id,
                        userId: u.id,
                        rating: ratingValue,
                        text:
                            ratingValue >= 5
                                ? 'Bộ câu hỏi rất thực tế, em rất thích!'
                                : ratingValue === 4
                                  ? 'Nội dung ôn tập chuẩn xác.'
                                  : 'Cần bổ sung thêm hình ảnh minh họa.',
                    },
                });
            }
        }
    }
}

function makeRealisticGmail(localPart: string): string {
    const lp = slugify(localPart).replace(/-/g, '.');
    return `${lp}@gmail.com`;
}

function makeQuizTemplates() {
    return {
        'Nghệ thuật': [
            { title: 'Danh họa & Tác phẩm kinh điển', description: 'Kiểm tra kiến thức về hội họa thế giới.', image: 'https://images.unsplash.com/photo-1578301978693-85fa9c03fa75?auto=format&fit=crop&w=800&q=80' },
            { title: 'Kiến trúc nổi tiếng thế giới', description: 'Từ cổ đại đến hiện đại.', image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80' },
            { title: 'Âm nhạc cổ điển cơ bản', description: 'Mozart, Beethoven và các tác phẩm nổi tiếng.', image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=800&q=80' },
            { title: 'Nghệ thuật Phục hưng', description: 'Nhân vật và tác phẩm tiêu biểu.', image: 'https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?auto=format&fit=crop&w=800&q=80' },
            { title: 'Phong trào nghệ thuật hiện đại', description: 'Ấn tượng, Lập thể, Siêu thực, Pop Art.', image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=800&q=80' },
        ],
        'Giải trí': [
            { title: 'Điện ảnh: Kiến thức nhanh', description: 'Từ Oscar đến các bộ phim kinh điển.', image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80' },
            { title: 'Vũ trụ Điện ảnh Marvel (MCU)', description: 'Kiến thức về các siêu anh hùng.', image: 'https://images.unsplash.com/photo-1608889175123-8ee362201f81?auto=format&fit=crop&w=800&q=80' },
            { title: 'Nhạc Pop & K-pop', description: 'Xu hướng âm nhạc đại chúng.', image: 'https://images.unsplash.com/photo-1514525253361-bee1d31f019b?auto=format&fit=crop&w=800&q=80' },
            { title: 'Game kinh điển', description: 'Mario, Zelda và nhiều hơn thế.', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80' },
            { title: 'Series truyền hình nổi tiếng', description: 'Cùng điểm lại các series đình đám.', image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=800&q=80' },
        ],
        'Địa lý': [
            { title: 'Địa lý Việt Nam', description: 'Tỉnh thành, sông núi, địa danh.', image: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80' },
            { title: 'Thủ đô thế giới', description: 'Bạn có nhớ thủ đô các nước?', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80' },
            { title: 'Kỳ quan thiên nhiên', description: 'Những địa điểm đẹp nhất hành tinh.', image: 'https://images.unsplash.com/photo-1433838552652-f9a46b332c40?auto=format&fit=crop&w=800&q=80' },
            { title: 'Đông Nam Á', description: 'Các quốc gia láng giềng quanh ta.', image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80' },
            { title: 'Biển và đại dương', description: 'Kiến thức đại dương học cơ bản.', image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80' },
        ],
        'Lịch sử': [
            { title: 'Lịch sử Việt Nam', description: 'Các mốc lịch sử quan trọng.', image: 'https://images.unsplash.com/photo-1557053910-d9eadeed1c58?auto=format&fit=crop&w=800&q=80' },
            { title: 'Văn minh cổ đại', description: 'Ai Cập, Lưỡng Hà, Hy Lạp, La Mã.', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80' },
            { title: 'Thế chiến thứ hai', description: 'Sự kiện và nhân vật nổi bật.', image: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=800&q=80' },
            { title: 'Triều đại nhà Trần', description: 'Kháng chiến và các danh tướng.', image: 'https://images.unsplash.com/photo-1548625361-1ac4df7a36c5?auto=format&fit=crop&w=800&q=80' },
            { title: 'Lịch sử khoa học công nghệ', description: 'Những phát minh thay đổi thế giới.', image: 'https://images.unsplash.com/photo-1461360228754-6e81c478b882?auto=format&fit=crop&w=800&q=80' },
        ],
        'Ngôn ngữ': [
            { title: 'Tiếng Việt: thành ngữ tục ngữ', description: 'Kho tàng trí tuệ dân gian.', image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80' },
            { title: 'Từ vựng tiếng Anh thông dụng', description: 'Từ vựng cơ bản mỗi ngày.', image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80' },
            { title: 'Ngữ pháp tiếng Anh cơ bản', description: 'Các cấu trúc thường gặp.', image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80' },
            { title: 'Thơ ca Việt Nam', description: 'Tác giả và tác phẩm nổi tiếng.', image: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?auto=format&fit=crop&w=800&q=80' },
            { title: 'Chữ viết Việt Nam', description: 'Chữ Nôm và chữ Quốc ngữ.', image: 'https://images.unsplash.com/photo-1491841573634-2e90f2307525?auto=format&fit=crop&w=800&q=80' },
        ],
        'Khoa học': [
            { title: 'Khoa học thường thức', description: 'Câu hỏi nhanh về tự nhiên.', image: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80' },
            { title: 'Vũ trụ & Hệ Mặt Trời', description: 'Khám phá không gian.', image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=800&q=80' },
            { title: 'Cơ thể người', description: 'Giải phẫu và sức khỏe.', image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80' },
            { title: 'Hóa học cơ bản', description: 'Nguyên tố và phản ứng đơn giản.', image: 'https://images.unsplash.com/photo-1614728263952-84ea206f99b6?auto=format&fit=crop&w=800&q=80' },
            { title: 'Các nhà khoa học nổi tiếng', description: 'Einstein, Newton và nhiều hơn.', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80' },
        ],
        'Thể thao': [
            { title: 'Bóng đá', description: 'Luật chơi và kỷ lục.', image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80' },
            { title: 'Olympic', description: 'Biểu tượng, môn thi và lịch sử.', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80' },
            { title: 'Bóng rổ NBA', description: 'Đội bóng và huyền thoại.', image: 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&w=800&q=80' },
            { title: 'Quần vợt', description: 'Grand Slam và tay vợt.', image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80' },
            { title: 'Thể thao điện tử (Esports)', description: 'Các giải đấu và đội tuyển.', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80' },
        ],
        'Đố vui': [
            { title: 'Đố mẹo dân gian', description: 'Câu đố vui và mẹo.', image: 'https://images.unsplash.com/photo-1516533037047-28249a475e33?auto=format&fit=crop&w=800&q=80' },
            { title: 'Đố vui IQ', description: 'Thử thách tư duy.', image: 'https://images.unsplash.com/photo-1590012357758-bb2415bca612?auto=format&fit=crop&w=800&q=80' },
            { title: 'Kiến thức tổng hợp', description: 'Đa lĩnh vực, trả lời nhanh.', image: 'https://images.unsplash.com/photo-1518331647614-7a1fb05029ca?auto=format&fit=crop&w=800&q=80' },
            { title: 'Nhìn hình đoán chữ', description: 'Liên tưởng và sáng tạo.', image: 'https://images.unsplash.com/photo-1532012197367-2bd1618037c7?auto=format&fit=crop&w=800&q=80' },
            { title: 'Câu đố tư duy logic', description: 'Rèn luyện bộ não.', image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=800&q=80' },
        ],
    } as const;
}

function makeQuestionsFor(category: string, quizTitle: string): SeedQuestion[] {
    switch (category) {
        case 'Lịch sử':
            return [
                {
                    type: 'BUTTONS',
                    text: 'Chiến dịch Điện Biên Phủ kết thúc thắng lợi vào năm nào?',
                    options: [
                        { text: '1954', isCorrect: true },
                        { text: '1945', isCorrect: false },
                        { text: '1975', isCorrect: false },
                        { text: '1968', isCorrect: false },
                    ],
                },
                {
                    type: 'CHECKBOXES',
                    text: 'Những vị tướng nào sau đây đã trực tiếp chỉ huy trong các cuộc kháng chiến của Việt Nam? (Chọn nhiều)',
                    options: [
                        { text: 'Võ Nguyên Giáp', isCorrect: true },
                        { text: 'Nguyễn Chí Thanh', isCorrect: true },
                        { text: 'Trần Hưng Đạo', isCorrect: false },
                        { text: 'Lý Thường Kiệt', isCorrect: false },
                    ],
                },
                {
                    type: 'TYPEANSWER',
                    text: 'Vị vua cuối cùng của chế độ phong kiến Việt Nam là ai?',
                    data: { correctAnswer: 'Bảo Đại' },
                },
                {
                    type: 'REORDER',
                    text: 'Sắp xếp các triều đại phong kiến Việt Nam theo thứ tự thời gian từ trước đến sau:',
                    options: [
                        { text: 'Nhà Lý', order: 1 },
                        { text: 'Nhà Trần', order: 2 },
                        { text: 'Nhà Hậu Lê', order: 3 },
                        { text: 'Nhà Nguyễn', order: 4 },
                    ],
                },
            ];

        case 'Địa lý':
            return [
                {
                    type: 'BUTTONS',
                    text: 'Đỉnh núi nào được mệnh danh là "Nóc nhà Đông Dương"?',
                    options: [
                        { text: 'Fansipan', isCorrect: true },
                        { text: 'Langbiang', isCorrect: false },
                        { text: 'Bạch Mã', isCorrect: false },
                        { text: 'Ngọc Linh', isCorrect: false },
                    ],
                },
                {
                    type: 'CHECKBOXES',
                    text: 'Những tỉnh/thành phố nào sau đây giáp biển? (Chọn nhiều)',
                    options: [
                        { text: 'Đà Nẵng', isCorrect: true },
                        { text: 'Hải Phòng', isCorrect: true },
                        { text: 'Gia Lai', isCorrect: false },
                        { text: 'Lâm Đồng', isCorrect: false },
                    ],
                },
                {
                    type: 'LOCATION',
                    text: 'Hãy ghim vị trí của Thủ đô Hà Nội trên bản đồ.',
                    data: { correctLatitude: 21.0285, correctLongitude: 105.8542 },
                },
                {
                    type: 'REORDER',
                    text: 'Sắp xếp các tỉnh/thành phố sau theo thứ tự địa lý từ Bắc vào Nam:',
                    options: [
                        { text: 'Hà Giang', order: 1 },
                        { text: 'Hà Nội', order: 2 },
                        { text: 'Đà Nẵng', order: 3 },
                        { text: 'TP. Hồ Chí Minh', order: 4 },
                    ],
                },
            ];

        case 'Khoa học':
            return [
                {
                    type: 'BUTTONS',
                    text: 'Công thức hóa học của muối ăn (muối bếp) là gì?',
                    options: [
                        { text: 'NaCl', isCorrect: true },
                        { text: 'H2O', isCorrect: false },
                        { text: 'CO2', isCorrect: false },
                        { text: 'H2SO4', isCorrect: false },
                    ],
                },
                {
                    type: 'CHECKBOXES',
                    text: 'Những hành tinh nào sau đây thuộc Hệ Mặt Trời? (Chọn nhiều)',
                    options: [
                        { text: 'Trái Đất', isCorrect: true },
                        { text: 'Sao Hỏa', isCorrect: true },
                        { text: 'Mặt Trăng (Vệ tinh, không phải hành tinh)', isCorrect: false },
                        { text: 'Sirius (Sao Thiên Lang)', isCorrect: false },
                    ],
                },
                {
                    type: 'TYPEANSWER',
                    text: 'Nguyên tố phổ biến nhất trong vũ trụ là gì?',
                    data: { correctAnswer: 'Hydro' },
                },
                {
                    type: 'REORDER',
                    text: 'Sắp xếp các hành tinh sau theo thứ tự từ gần Mặt Trời nhất đến xa Mặt Trời nhất:',
                    options: [
                        { text: 'Sao Thủy', order: 1 },
                        { text: 'Sao Kim', order: 2 },
                        { text: 'Trái Đất', order: 3 },
                        { text: 'Sao Hỏa', order: 4 },
                    ],
                },
            ];

        case 'Nghệ thuật':
            return [
                {
                    type: 'BUTTONS',
                    text: 'Bức tranh "Mona Lisa" nổi tiếng là tác phẩm của họa sĩ nào?',
                    options: [
                        { text: 'Leonardo da Vinci', isCorrect: true },
                        { text: 'Pablo Picasso', isCorrect: false },
                        { text: 'Vincent van Gogh', isCorrect: false },
                        { text: 'Claude Monet', isCorrect: false },
                    ],
                },
                {
                    type: 'CHECKBOXES',
                    text: 'Trong dàn nhạc giao hưởng, những nhạc cụ nào thuộc bộ dây? (Chọn nhiều)',
                    options: [
                        { text: 'Violin (Vĩ cầm)', isCorrect: true },
                        { text: 'Cello (Tứ cầm)', isCorrect: true },
                        { text: 'Piano (Dương cầm)', isCorrect: false },
                        { text: 'Flute (Sáo)', isCorrect: false },
                    ],
                },
                {
                    type: 'TYPEANSWER',
                    text: 'Nhạc sĩ nào đã sáng tác bản giao hưởng số 5 "Định mệnh" mặc dù bị khiếm thính?',
                    data: { correctAnswer: 'Beethoven' },
                },
                {
                    type: 'REORDER',
                    text: 'Sắp xếp các bước cơ bản để hoàn thiện một bức tranh sơn dầu:',
                    options: [
                        { text: 'Phác thảo bố cục', order: 1 },
                        { text: 'Lên màu lót (Underpainting)', order: 2 },
                        { text: 'Vẽ chi tiết và đẩy sáng tối', order: 3 },
                        { text: 'Phủ bóng bảo vệ (Varnish)', order: 4 },
                    ],
                },
            ];

        case 'Giải trí':
            return [
                {
                    type: 'BUTTONS',
                    text: 'Bộ phim điện ảnh nào đang giữ kỷ lục doanh thu phòng vé cao nhất mọi thời đại (tính đến đầu 2024)?',
                    options: [
                        { text: 'Avatar (2009)', isCorrect: true },
                        { text: 'Avengers: Endgame', isCorrect: false },
                        { text: 'Titanic', isCorrect: false },
                        { text: 'Star Wars: The Force Awakens', isCorrect: false },
                    ],
                },
                {
                    type: 'CHECKBOXES',
                    text: 'Những nhân vật siêu anh hùng nào thuộc Vũ trụ Điện ảnh Marvel (MCU)? (Chọn nhiều)',
                    options: [
                        { text: 'Iron Man', isCorrect: true },
                        { text: 'Spider-Man', isCorrect: true },
                        { text: 'Batman', isCorrect: false },
                        { text: 'Superman', isCorrect: false },
                    ],
                },
                {
                    type: 'TYPEANSWER',
                    text: 'Điền tên thật của nam ca sĩ Sơn Tùng M-TP: Nguyễn Thanh ...',
                    data: { correctAnswer: 'Tùng' },
                },
                {
                    type: 'REORDER',
                    text: 'Sắp xếp thứ tự ra mắt của các bộ phim Harry Potter sau:',
                    options: [
                        { text: 'Hòn đá Phù thủy', order: 1 },
                        { text: 'Phòng chứa Bí mật', order: 2 },
                        { text: 'Tù nhân Azkaban', order: 3 },
                        { text: 'Chiếc cốc lửa', order: 4 },
                    ],
                },
            ];

        case 'Ngôn ngữ':
            return [
                {
                    type: 'BUTTONS',
                    text: 'Từ nào sau đây viết đúng chính tả tiếng Việt?',
                    options: [
                        { text: 'Xuất sắc', isCorrect: true },
                        { text: 'Xuất xắc', isCorrect: false },
                        { text: 'Suất sắc', isCorrect: false },
                        { text: 'Suất xắc', isCorrect: false },
                    ],
                },
                {
                    type: 'CHECKBOXES',
                    text: 'Những từ nào sau đây là từ láy? (Chọn nhiều)',
                    options: [
                        { text: 'Lung linh', isCorrect: true },
                        { text: 'Lấp lánh', isCorrect: true },
                        { text: 'Quần áo', isCorrect: false },
                        { text: 'Sách vở', isCorrect: false },
                    ],
                },
                {
                    type: 'TYPEANSWER',
                    text: 'Điền từ còn thiếu vào câu tục ngữ: "Gần mực thì đen, gần đèn thì ..."',
                    data: { correctAnswer: 'sáng' },
                },
                {
                    type: 'REORDER',
                    text: 'Sắp xếp các thành phần để tạo thành một câu khẳng định cơ bản trong tiếng Anh (Cấu trúc S-V-O-A):',
                    options: [
                        { text: 'Chủ ngữ (Subject)', order: 1 },
                        { text: 'Động từ (Verb)', order: 2 },
                        { text: 'Tân ngữ (Object)', order: 3 },
                        { text: 'Trạng từ (Adverb)', order: 4 },
                    ],
                },
            ];

        case 'Thể thao':
            return [
                {
                    type: 'BUTTONS',
                    text: 'Đội tuyển quốc gia nào đã giành chức vô địch FIFA World Cup 2022 tại Qatar?',
                    options: [
                        { text: 'Argentina', isCorrect: true },
                        { text: 'Pháp', isCorrect: false },
                        { text: 'Brazil', isCorrect: false },
                        { text: 'Croatia', isCorrect: false },
                    ],
                },
                {
                    type: 'CHECKBOXES',
                    text: 'Những vận động viên nào sau đây nổi tiếng trong môn Quần vợt (Tennis)? (Chọn nhiều)',
                    options: [
                        { text: 'Roger Federer', isCorrect: true },
                        { text: 'Rafael Nadal', isCorrect: true },
                        { text: 'Lionel Messi', isCorrect: false },
                        { text: 'LeBron James', isCorrect: false },
                    ],
                },
                {
                    type: 'TYPEANSWER',
                    text: 'Môn thể thao nào được mệnh danh là "Môn thể thao vua"?',
                    data: { correctAnswer: 'Bóng đá' },
                },
                {
                    type: 'REORDER',
                    text: 'Sắp xếp các loại huy chương Olympic theo thứ hạng từ cao xuống thấp:',
                    options: [
                        { text: 'Huy chương Vàng', order: 1 },
                        { text: 'Huy chương Bạc', order: 2 },
                        { text: 'Huy chương Đồng', order: 3 },
                        { text: 'Bằng khen (Diploma)', order: 4 },
                    ],
                },
            ];

        case 'Đố vui':
        default:
            return [
                {
                    type: 'BUTTONS',
                    text: 'Cái gì người mua biết, người bán biết, nhưng người xài thì không bao giờ biết?',
                    options: [
                        { text: 'Quan tài', isCorrect: true },
                        { text: 'Áo mưa', isCorrect: false },
                        { text: 'Bảo hiểm nhân thọ', isCorrect: false },
                        { text: 'Vàng mã', isCorrect: false },
                    ],
                },
                {
                    type: 'CHECKBOXES',
                    text: 'Tháng nào trong năm dương lịch có 28 ngày? (Đố mẹo, cẩn thận!)',
                    options: [
                        { text: 'Tháng 2', isCorrect: true },
                        { text: 'Tháng 1, 3, 5, 7, 8, 10, 12', isCorrect: true },
                        { text: 'Tháng 4, 6, 9, 11', isCorrect: true },
                        { text: 'Chỉ riêng tháng 2 năm nhuận', isCorrect: false },
                    ],
                },
                {
                    type: 'TYPEANSWER',
                    text: 'Con gì đập thì sống, không đập thì chết?',
                    data: { correctAnswer: 'Con tim' },
                },
                {
                    type: 'REORDER',
                    text: 'Sắp xếp các bước để nấu một tô mì tôm úp chuẩn vị sinh viên:',
                    options: [
                        { text: 'Bóc gói mì và cho vắt mì vào tô', order: 1 },
                        { text: 'Cho các gói gia vị vào', order: 2 },
                        { text: 'Chế nước sôi ngập vắt mì', order: 3 },
                        { text: 'Đậy nắp chờ 3 phút rồi thưởng thức', order: 4 },
                    ],
                },
            ];
    }
}

function imageForQuiz(category: string, quizTitle: string): string {
    const categoryImages: Record<string, string> = {
        'Nghệ thuật': 'https://images.unsplash.com/photo-1578301978693-85fa9c03fa75?auto=format&fit=crop&w=800&q=80',
        'Giải trí': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
        'Địa lý': 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80',
        'Lịch sử': 'https://images.unsplash.com/photo-1557053910-d9eadeed1c58?auto=format&fit=crop&w=800&q=80',
        'Ngôn ngữ': 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80',
        'Khoa học': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
        'Thể thao': 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
        'Đố vui': 'https://images.unsplash.com/photo-1590012357758-bb2415bca612?auto=format&fit=crop&w=800&q=80',
    };
    
    return categoryImages[category] || 'https://images.unsplash.com/photo-1518331647614-7a1fb05029ca?auto=format&fit=crop&w=800&q=80';
}

async function main() {
    console.log('Bắt đầu seed dữ liệu thật (Demo Khóa Luận) ...');

    const admin = await upsertUser(makeRealisticGmail('quizmon.admin'), 'admin', {
        isAdmin: true,
        bio: 'Quản trị viên hệ thống Quizmon.',
    });
    const teacher = await upsertUser(makeRealisticGmail('nguyen.hoang.giao.vien'), 'nguyen_hoang', {
        bio: 'Giáo viên tâm huyết, yêu thích sáng tạo nội dung giáo dục.',
    });

    const studentNames = [
        'An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Hưng', 'Khánh', 'Linh', 'Minh', 'Ngọc',
        'Phúc', 'Quân', 'Sơn', 'Trang', 'Tuấn', 'Vy', 'Yến', 'Đạt', 'Hạnh', 'Tâm',
        'Thảo', 'Thịnh', 'Tiến', 'Tú', 'Vân', 'Việt', 'Xuân', 'Đức', 'Hiếu', 'Khoa',
    ];
    const students: SeedUser[] = [];
    for (let i = 0; i < studentNames.length; i++) {
        const full = `le.${studentNames[i]}.${i + 1}`;
        students.push(
            await upsertUser(makeRealisticGmail(full), `le_${slugify(studentNames[i])}_${i + 1}`, {
                bio: `Học sinh lớp 10A1.`,
            })
        );
    }

    console.log('Đã tạo users:', { admin: admin.email, teacher: teacher.email, students: students.length });

    const categoryNames = [
        'Nghệ thuật', 'Giải trí', 'Địa lý', 'Lịch sử',
        'Ngôn ngữ', 'Khoa học', 'Thể thao', 'Đố vui'
    ];
    const categories = await upsertCategoriesInOrder(categoryNames);

    await prisma.quizRating.deleteMany({ where: { quiz: { creatorId: teacher.id } } });
    await prisma.matchResult.deleteMany({ where: { match: { hostId: teacher.id } } });
    await prisma.match.deleteMany({ where: { hostId: teacher.id } });
    await prisma.questionOption.deleteMany({ where: { question: { quiz: { creatorId: teacher.id } } } });
    await prisma.questionMedia.deleteMany({ where: { question: { quiz: { creatorId: teacher.id } } } });
    await prisma.question.deleteMany({ where: { quiz: { creatorId: teacher.id } } });
    await prisma.quiz.deleteMany({ where: { creatorId: teacher.id } });

    const createdQuizzes: Array<{ id: number; title: string }> = [];
    const templates = makeQuizTemplates();
    for (const category of categoryNames) {
        const items = (templates as any)[category] as Array<{ title: string; description: string; image?: string }>;

        for (const item of items) {
            const quiz = await createQuizWithQuestions({
                creatorId: teacher.id,
                categoryId: categories[category].id,
                title: item.title,
                description: item.description,
                image: item.image ?? imageForQuiz(category, item.title),
                questions: makeQuestionsFor(category, item.title),
            });
            createdQuizzes.push(quiz);
        }
    }

    console.log(`Đã tạo quizzes: ${createdQuizzes.length}`);

    await seedPlansAndPromotions();
    const classroom = await seedClassroom({ teacherId: teacher.id, studentUsers: students });
    await prisma.quizRating.deleteMany({ where: { userId: { in: students.map(s => s.id) } } });
    await seedHomeworkAndRatings({ teacherId: teacher.id, classroomId: classroom.id, quizzes: createdQuizzes, students });

    console.log('Hoàn thành seed dữ liệu thành công! Data sẵn sàng cho buổi bảo vệ.');
}

main()
    .catch((e) => {
        console.error(e);
        (globalThis as any).process?.exit?.(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });