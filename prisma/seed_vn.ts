import { PrismaClient, QuestionType, MediaType, PlanType, FeatureKey } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Bắt đầu nạp dữ liệu tiếng Việt (Seed VN)...');

    // 1. Tạo người dùng mẫu
    const hashedPassword = await bcrypt.hash('password123', 10);

    const userVn = await prisma.user.upsert({
        where: { email: 'giaovien@quizmon.vn' },
        update: {},
        create: {
            username: 'giaovien_vn',
            email: 'giaovien@quizmon.vn',
            password: hashedPassword,
            bio: 'Giáo viên yêu thích lịch sử và văn hóa Việt Nam.',
        },
    });

    console.log('Đã tạo người dùng:', userVn.username);

    // 2. Tạo danh mục (Categories)
    const categories = [
        { name: 'Lịch sử Việt Nam' },
        { name: 'Địa lý Việt Nam' },
        { name: 'Văn hóa & Nghệ thuật' },
        { name: 'Ẩm thực Việt' },
        { name: 'Khoa học & Đời sống' }
    ];

    const createdCategories = [];
    for (const cat of categories) {
        const c = await prisma.quizCategory.create({
            data: cat,
        });
        createdCategories.push(c);
    }
    console.log('Đã tạo các danh mục:', createdCategories.map(c => c.name));

    const catLichSu = createdCategories.find(c => c.name === 'Lịch sử Việt Nam')!;
    const catDiaLy = createdCategories.find(c => c.name === 'Địa lý Việt Nam')!;
    const catAmThuc = createdCategories.find(c => c.name === 'Ẩm thực Việt')!;

    // 3. Quiz 1: Hành trình di sản Việt Nam (Lịch sử/Văn hóa)
    const quizDiSan = await prisma.quiz.create({
        data: {
            title: 'Hành trình di sản Việt Nam',
            description: 'Khám phá các di sản văn hóa và thiên nhiên thế giới tại Việt Nam đã được UNESCO công nhận.',
            isPublic: true,
            creatorId: userVn.id,
            categoryId: catLichSu.id,
        },
    });

    // -- Câu hỏi 1: BUTTONS (Lựa chọn đơn) --
    await prisma.question.create({
        data: {
            text: 'Cố đô Huế được UNESCO công nhận là Di sản Văn hóa Thế giới vào năm nào?',
            type: QuestionType.BUTTONS,
            quizId: quizDiSan.id,
            options: {
                create: [
                    { text: '1993', isCorrect: true },
                    { text: '1999', isCorrect: false },
                    { text: '2003', isCorrect: false },
                    { text: '2010', isCorrect: false },
                ],
            },
        },
    });

    // -- Câu hỏi 2: CHECKBOXES (Lựa chọn nhiều) --
    await prisma.question.create({
        data: {
            text: 'Những địa danh nào sau đây là di sản thiên nhiên thế giới tại Việt Nam?',
            type: QuestionType.CHECKBOXES,
            quizId: quizDiSan.id,
            options: {
                create: [
                    { text: 'Vịnh Hạ Long', isCorrect: true },
                    { text: 'Vườn quốc gia Phong Nha - Kẻ Bàng', isCorrect: true },
                    { text: 'Phố cổ Hội An', isCorrect: false },
                    { text: 'Thánh địa Mỹ Sơn', isCorrect: false },
                ],
            },
        },
    });

    // -- Câu hỏi 3: REORDER (Sắp xếp) --
    await prisma.question.create({
        data: {
            text: 'Sắp xếp các triều đại Việt Nam theo thứ tự thời gian từ sớm nhất đến muộn nhất:',
            type: QuestionType.REORDER,
            quizId: quizDiSan.id,
            options: {
                create: [
                    { text: 'Nhà Lý', order: 1 },
                    { text: 'Nhà Trần', order: 2 },
                    { text: 'Nhà Lê Sơ', order: 3 },
                    { text: 'Nhà Nguyễn', order: 4 },
                ],
            },
        },
    });

    // -- Câu hỏi 4: TYPEANSWER (Điền từ) --
    await prisma.question.create({
        data: {
            text: 'Ai là người đã đọc bản Tuyên ngôn Độc lập khai sinh ra nước Việt Nam Dân chủ Cộng hòa vào ngày 2/9/1945?',
            type: QuestionType.TYPEANSWER,
            quizId: quizDiSan.id,
            data: { correctAnswer: 'Hồ Chí Minh' },
        },
    });

    // -- Câu hỏi 5: LOCATION (Vị trí) --
    await prisma.question.create({
        data: {
            text: 'Hãy xác định vị trí của Quần thể danh thắng Tràng An trên bản đồ.',
            type: QuestionType.LOCATION,
            quizId: quizDiSan.id,
            data: { correctLatitude: 20.2539, correctLongitude: 105.8927 },
        },
    });

    console.log('Đã tạo Quiz: Hành trình di sản Việt Nam');

    // 4. Quiz 2: Khám phá ẩm thực 3 miền
    const quizAmThuc = await prisma.quiz.create({
        data: {
            title: 'Khám phá ẩm thực 3 miền',
            description: 'Kiểm tra kiến thức của bạn về sự đa dạng và phong phú của món ăn Việt Nam.',
            isPublic: true,
            creatorId: userVn.id,
            categoryId: catAmThuc.id,
        },
    });

    // -- Câu hỏi 1: BUTTONS --
    await prisma.question.create({
        data: {
            text: 'Món ăn nào được xem là "quốc hồn quốc túy" của Việt Nam và nổi tiếng khắp thế giới?',
            type: QuestionType.BUTTONS,
            quizId: quizAmThuc.id,
            options: {
                create: [
                    { text: 'Phở', isCorrect: true },
                    { text: 'Bún chả', isCorrect: false },
                    { text: 'Bánh xèo', isCorrect: false },
                    { text: 'Gỏi cuốn', isCorrect: false },
                ],
            },
        },
    });

    // -- Câu hỏi 2: CHECKBOXES --
    await prisma.question.create({
        data: {
            text: 'Các nguyên liệu chính thường có trong một bát Bún bò Huế là gì?',
            type: QuestionType.CHECKBOXES,
            quizId: quizAmThuc.id,
            options: {
                create: [
                    { text: 'Thịt bò', isCorrect: true },
                    { text: 'Sợi bún to', isCorrect: true },
                    { text: 'Mắm ruốc', isCorrect: true },
                    { text: 'Dầu ô liu', isCorrect: false },
                ],
            },
        },
    });

    // 5. Quiz 3: Địa lý Việt Nam hào hùng
    const quizDiaLy = await prisma.quiz.create({
        data: {
            title: 'Địa lý Việt Nam hào hùng',
            description: 'Kiến thức về các tỉnh thành, núi non và sông ngòi của Việt Nam.',
            isPublic: true,
            creatorId: userVn.id,
            categoryId: catDiaLy.id,
        },
    });

    // -- Câu hỏi 1: BUTTONS --
    await prisma.question.create({
        data: {
            text: 'Đỉnh núi nào được mệnh danh là "Nóc nhà Đông Dương"?',
            type: QuestionType.BUTTONS,
            quizId: quizDiaLy.id,
            options: {
                create: [
                    { text: 'Fansipan', isCorrect: true },
                    { text: 'Tây Côn Lĩnh', isCorrect: false },
                    { text: 'Pusilung', isCorrect: false },
                    { text: 'Ngọc Linh', isCorrect: false },
                ],
            },
        },
    });

    // -- Câu hỏi 2: LOCATION --
    await prisma.question.create({
        data: {
            text: 'Hãy chỉ ra vị trí của Mũi Cà Mau - điểm cực Nam trên đất liền của Tổ quốc.',
            type: QuestionType.LOCATION,
            quizId: quizDiaLy.id,
            data: { correctLatitude: 8.5623, correctLongitude: 104.8315 },
        },
    });

    console.log('Đã tạo xong dữ liệu tiếng Việt.');
    console.log('Seed VN kết thúc thành công!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
