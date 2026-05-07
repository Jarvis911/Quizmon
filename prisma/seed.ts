import { PrismaClient, QuestionType, MediaType, PlanType, FeatureKey } from '@prisma/client';
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

    // 3. Tạo Quiz mẫu cho từng danh mục (5-6 quiz mỗi danh mục)
    const quizData = [
        {
            category: 'Nghệ thuật',
            quizzes: [
                {
                    title: 'Danh họa và Tác phẩm kinh điển',
                    description: 'Kiểm tra kiến thức về các họa sĩ nổi tiếng và những bức tranh huyền thoại thế giới.',
                    image: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Ai là tác giả của bức tranh "Mona Lisa"?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Leonardo da Vinci', isCorrect: true },
                                { text: 'Vincent van Gogh', isCorrect: false },
                                { text: 'Pablo Picasso', isCorrect: false },
                                { text: 'Claude Monet', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Kiến trúc thế giới qua các thời kỳ',
                    description: 'Từ Kim tự tháp Ai Cập đến các tòa nhà chọc trời hiện đại.',
                    image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Đấu trường La Mã (Colosseum) nằm ở quốc gia nào?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Ý', isCorrect: true },
                                { text: 'Hy Lạp', isCorrect: false },
                                { text: 'Pháp', isCorrect: false },
                                { text: 'Tây Ban Nha', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Âm nhạc cổ điển và các nhà soạn nhạc',
                    description: 'Những giai điệu bất hủ của Beethoven, Mozart và Bach.',
                    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Ai được mệnh danh là "Thần đồng âm nhạc"?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Wolfgang Amadeus Mozart', isCorrect: true },
                                { text: 'Ludwig van Beethoven', isCorrect: false },
                                { text: 'Johann Sebastian Bach', isCorrect: false },
                                { text: 'Frederic Chopin', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Nghệ thuật Phục hưng',
                    description: 'Giai đoạn bùng nổ của tư duy và sáng tạo nghệ thuật tại Châu Âu.',
                    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Bức tượng "David" nổi tiếng là tác phẩm của ai?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Michelangelo', isCorrect: true },
                                { text: 'Donatello', isCorrect: false },
                                { text: 'Raphael', isCorrect: false },
                                { text: 'Caravaggio', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Các phong trào nghệ thuật hiện đại',
                    description: 'Tìm hiểu về Ấn tượng, Lập thể, Siêu thực và Nghệ thuật Pop.',
                    image: 'https://images.unsplash.com/photo-1579783901586-d88db74b4fe1?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Salvador Dalí nổi tiếng với phong cách nghệ thuật nào?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Chủ nghĩa Siêu thực', isCorrect: true },
                                { text: 'Chủ nghĩa Ấn tượng', isCorrect: false },
                                { text: 'Chủ nghĩa Lập thể', isCorrect: false },
                                { text: 'Chủ nghĩa Biểu hiện', isCorrect: false },
                            ],
                        }
                    ]
                }
            ]
        },
        {
            category: 'Giải trí',
            quizzes: [
                {
                    title: 'Thế giới Điện ảnh & Âm nhạc',
                    description: 'Những câu hỏi thú vị về các bộ phim bom tấn và nghệ sĩ nổi tiếng.',
                    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Giải thưởng cao quý nhất của điện ảnh thế giới là giải gì?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Oscar', isCorrect: true },
                                { text: 'Grammy', isCorrect: false },
                                { text: 'Emmy', isCorrect: false },
                                { text: 'Golden Globe', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Phim hoạt hình Disney và Pixar',
                    description: 'Thử thách kiến thức về các nhân vật hoạt hình gắn liền với tuổi thơ.',
                    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Trong phim "Vua Sư Tử", tên của nhân vật chính là gì?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Simba', isCorrect: true },
                                { text: 'Mufasa', isCorrect: false },
                                { text: 'Scar', isCorrect: false },
                                { text: 'Timon', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Nhạc Pop thế giới và K-pop',
                    description: 'Cập nhật những xu hướng âm nhạc và các nhóm nhạc thần tượng.',
                    image: 'https://images.unsplash.com/photo-1514525253361-bee1d31f019b?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Nhóm nhạc K-pop nào có bài hát "Dynamite" đạt vị trí số 1 Billboard Hot 100?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'BTS', isCorrect: true },
                                { text: 'BLACKPINK', isCorrect: false },
                                { text: 'EXO', isCorrect: false },
                                { text: 'TWICE', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Trò chơi điện tử kinh điển',
                    description: 'Từ Mario đến Liên Minh Huyền Thoại.',
                    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Công ty nào đã tạo ra nhân vật Mario?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Nintendo', isCorrect: true },
                                { text: 'Sega', isCorrect: false },
                                { text: 'Sony', isCorrect: false },
                                { text: 'Microsoft', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Oscar và những kỷ lục',
                    description: 'Những bộ phim và diễn viên xuất sắc nhất lịch sử điện ảnh.',
                    image: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Bộ phim nào sau đây giành được 11 giải Oscar?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Titanic', isCorrect: true },
                                { text: 'Avatar', isCorrect: false },
                                { text: 'Godfather', isCorrect: false },
                                { text: 'La La Land', isCorrect: false },
                            ],
                        }
                    ]
                }
            ]
        },
        {
            category: 'Địa lý',
            quizzes: [
                {
                    title: 'Khám phá Việt Nam và Thế giới',
                    description: 'Kiến thức về các địa danh, núi non và sông ngòi hùng vĩ.',
                    image: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Sông nào dài nhất thế giới?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Sông Nile', isCorrect: true },
                                { text: 'Sông Amazon', isCorrect: false },
                                { text: 'Sông Mekong', isCorrect: false },
                                { text: 'Sông Mississippi', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Các thủ đô trên thế giới',
                    description: 'Bạn có biết thủ đô của các quốc gia này không?',
                    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Thủ đô của nước Pháp là gì?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Paris', isCorrect: true },
                                { text: 'London', isCorrect: false },
                                { text: 'Berlin', isCorrect: false },
                                { text: 'Rome', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Kỳ quan thiên nhiên thế giới',
                    description: 'Những địa điểm đẹp nhất hành tinh.',
                    image: 'https://images.unsplash.com/photo-1433838552652-f9a46b332c40?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Đỉnh núi nào cao nhất thế giới?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Everest', isCorrect: true },
                                { text: 'K2', isCorrect: false },
                                { text: 'Fansipan', isCorrect: false },
                                { text: 'Phú Sĩ', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Các quốc gia Đông Nam Á',
                    description: 'Tìm hiểu về những người hàng xóm quanh chúng ta.',
                    image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Quốc gia nào được mệnh danh là "Xứ sở Chùa Vàng"?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Thái Lan', isCorrect: true },
                                { text: 'Lào', isCorrect: false },
                                { text: 'Campuchia', isCorrect: false },
                                { text: 'Myanmar', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Biển và đại dương',
                    description: 'Khám phá 70% diện tích bề mặt Trái Đất.',
                    image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Đại dương nào lớn nhất hành tinh?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Thái Bình Dương', isCorrect: true },
                                { text: 'Đại Tây Dương', isCorrect: false },
                                { text: 'Ấn Độ Dương', isCorrect: false },
                                { text: 'Bắc Băng Dương', isCorrect: false },
                            ],
                        }
                    ]
                }
            ]
        },
        {
            category: 'Lịch sử',
            quizzes: [
                {
                    title: 'Hào khí Việt Nam qua các thời đại',
                    description: 'Tìm hiểu về các cột mốc lịch sử quan trọng của dân tộc Việt Nam.',
                    image: 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Chiến thắng Điện Biên Phủ diễn ra vào năm nào?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: '1954', isCorrect: true },
                                { text: '1945', isCorrect: false },
                                { text: '1975', isCorrect: false },
                                { text: '1930', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Các nền văn minh cổ đại',
                    description: 'Từ Ai Cập, Lưỡng Hà đến Hy Lạp, La Mã.',
                    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Kim tự tháp Giza được xây dựng bởi nền văn minh nào?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Ai Cập', isCorrect: true },
                                { text: 'Hy Lạp', isCorrect: false },
                                { text: 'La Mã', isCorrect: false },
                                { text: 'Maya', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Chiến tranh thế giới thứ hai',
                    description: 'Những sự kiện thay đổi bản đồ địa chính trị thế giới.',
                    image: 'https://images.unsplash.com/photo-1564392257011-c1d07c5ff2c2?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Chiến tranh thế giới thứ hai kết thúc vào năm nào?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: '1945', isCorrect: true },
                                { text: '1918', isCorrect: false },
                                { text: '1939', isCorrect: false },
                                { text: '1950', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Triều đại nhà Trần',
                    description: 'Ba lần kháng chiến chống quân Nguyên - Mông lẫy lừng.',
                    image: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Vị tướng nào gắn liền với chiến thắng Bạch Đằng năm 1288?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Trần Hưng Đạo', isCorrect: true },
                                { text: 'Trần Quang Khải', isCorrect: false },
                                { text: 'Trần Nhật Duật', isCorrect: false },
                                { text: 'Phạm Ngũ Lão', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Lịch sử khoa học công nghệ',
                    description: 'Những phát minh làm thay đổi cuộc sống con người.',
                    image: 'https://images.unsplash.com/photo-1461360228754-6e81c478b882?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Ai là người phát minh ra bóng đèn sợi đốt thành công?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Thomas Edison', isCorrect: true },
                                { text: 'Nikola Tesla', isCorrect: false },
                                { text: 'Alexander Graham Bell', isCorrect: false },
                                { text: 'Isaac Newton', isCorrect: false },
                            ],
                        }
                    ]
                }
            ]
        },
        {
            category: 'Ngôn ngữ',
            quizzes: [
                {
                    title: 'Phong ba bão táp không bằng ngữ pháp Việt Nam',
                    description: 'Kiểm tra khả năng sử dụng tiếng Việt và các thành ngữ, tục ngữ.',
                    image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Điền từ còn thiếu: "Học đi đôi với ..."',
                            type: QuestionType.TYPEANSWER,
                            data: { correctAnswer: 'hành' },
                        }
                    ]
                },
                {
                    title: 'Thành ngữ tục ngữ Việt Nam',
                    description: 'Kho tàng trí tuệ dân gian qua lời ăn tiếng nói.',
                    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Hoàn thành câu: "Gần mực thì đen, gần đèn thì ..."',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Sáng', isCorrect: true },
                                { text: 'Chói', isCorrect: false },
                                { text: 'Trắng', isCorrect: false },
                                { text: 'Tối', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Tiếng Anh thông dụng',
                    description: 'Kiểm tra từ vựng và ngữ pháp tiếng Anh cơ bản.',
                    image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Từ nào sau đây là từ đồng nghĩa với "Happy"?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Joyful', isCorrect: true },
                                { text: 'Sad', isCorrect: false },
                                { text: 'Angry', isCorrect: false },
                                { text: 'Bored', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Thơ ca Việt Nam hiện đại',
                    description: 'Những vần thơ đi cùng năm tháng.',
                    image: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Tác giả của bài thơ "Sóng" là ai?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Xuân Quỳnh', isCorrect: true },
                                { text: 'Hàn Mặc Tử', isCorrect: false },
                                { text: 'Xuân Diệu', isCorrect: false },
                                { text: 'Chế Lan Viên', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Chữ Nôm và chữ Quốc ngữ',
                    description: 'Tìm hiểu về quá trình hình thành chữ viết của người Việt.',
                    image: 'https://images.unsplash.com/photo-1491841573634-2e90f2307525?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Chữ Quốc ngữ được hình thành dựa trên bộ chữ cái nào?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Latinh', isCorrect: true },
                                { text: 'Hán', isCorrect: false },
                                { text: 'Hy Lạp', isCorrect: false },
                                { text: 'Cyrillic', isCorrect: false },
                            ],
                        }
                    ]
                }
            ]
        },
        {
            category: 'Khoa học',
            quizzes: [
                {
                    title: 'Khoa học thường thức & Vũ trụ',
                    description: 'Khám phá các quy luật tự nhiên và bí ẩn của không gian.',
                    image: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Hành tinh nào gần Mặt trời nhất?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Sao Thủy', isCorrect: true },
                                { text: 'Sao Kim', isCorrect: false },
                                { text: 'Trái Đất', isCorrect: false },
                                { text: 'Sao Hỏa', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Cơ thể người và sức khỏe',
                    description: 'Bạn hiểu bao nhiêu về chính cơ thể mình?',
                    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Xương nào dài nhất trong cơ thể người?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Xương đùi', isCorrect: true },
                                { text: 'Xương cánh tay', isCorrect: false },
                                { text: 'Xương sườn', isCorrect: false },
                                { text: 'Xương chày', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Thế giới động vật hoang dã',
                    description: 'Những điều thú vị về các loài sinh vật trên Trái Đất.',
                    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Động vật nào là loài thú lớn nhất thế giới còn tồn tại?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Cá voi xanh', isCorrect: true },
                                { text: 'Voi châu Phi', isCorrect: false },
                                { text: 'Hươu cao cổ', isCorrect: false },
                                { text: 'Cá mập trắng', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Bảng tuần hoàn các nguyên tố',
                    description: 'Thử thách kiến thức hóa học cơ bản.',
                    image: 'https://images.unsplash.com/photo-1614728263952-84ea206f99b6?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Ký hiệu hóa học của Vàng là gì?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Au', isCorrect: true },
                                { text: 'Ag', isCorrect: false },
                                { text: 'Fe', isCorrect: false },
                                { text: 'Cu', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Các nhà khoa học lỗi lạc',
                    description: 'Những người đã thay đổi cách chúng ta nhìn nhận thế giới.',
                    image: 'https://images.unsplash.com/photo-1506318137071-a8e063b4b4bf?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Ai là người phát hiện ra Thuyết tương đối?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Albert Einstein', isCorrect: true },
                                { text: 'Isaac Newton', isCorrect: false },
                                { text: 'Stephen Hawking', isCorrect: false },
                                { text: 'Galileo Galilei', isCorrect: false },
                            ],
                        }
                    ]
                }
            ]
        },
        {
            category: 'Thể thao',
            quizzes: [
                {
                    title: 'Đam mê Thể thao',
                    description: 'Cùng tìm hiểu về các bộ môn thể thao phổ biến và các huyền thoại.',
                    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Trận đấu bóng đá chính thức kéo dài bao nhiêu phút?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: '90 phút', isCorrect: true },
                                { text: '45 phút', isCorrect: false },
                                { text: '100 phút', isCorrect: false },
                                { text: '60 phút', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Bóng đá Việt Nam - Lịch sử',
                    description: 'Những khoảnh khắc huy hoàng của bóng đá nước nhà.',
                    image: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Việt Nam giành chức vô địch AFF Cup lần đầu tiên vào năm nào?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: '2008', isCorrect: true },
                                { text: '1998', isCorrect: false },
                                { text: '2018', isCorrect: false },
                                { text: '2004', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Thế vận hội Olympic',
                    description: 'Đại hội thể thao lớn nhất hành tinh.',
                    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Biểu tượng Olympic có bao nhiêu vòng tròn màu sắc?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: '5', isCorrect: true },
                                { text: '4', isCorrect: false },
                                { text: '6', isCorrect: false },
                                { text: '3', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Quần vợt và Grand Slam',
                    description: 'Những tay vợt hàng đầu và các giải đấu danh giá.',
                    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Giải quần vợt Wimbledon được tổ chức tại quốc gia nào?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Anh', isCorrect: true },
                                { text: 'Mỹ', isCorrect: false },
                                { text: 'Pháp', isCorrect: false },
                                { text: 'Úc', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Bóng rổ NBA',
                    description: 'Giải bóng rổ nhà nghề Mỹ và những ngôi sao rực sáng.',
                    image: 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Đội bóng nào được mệnh danh là "Binh đoàn Vàng - Lam"?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Golden State Warriors', isCorrect: true },
                                { text: 'LA Lakers', isCorrect: false },
                                { text: 'Chicago Bulls', isCorrect: false },
                                { text: 'Boston Celtics', isCorrect: false },
                            ],
                        }
                    ]
                }
            ]
        },
        {
            category: 'Đố vui',
            quizzes: [
                {
                    title: 'Câu đố dân gian & Đố mẹo',
                    description: 'Những câu đố vui giúp thư giãn và rèn luyện tư duy nhạy bén.',
                    image: 'https://images.unsplash.com/photo-1516533037047-28249a475e33?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Con gì chân ngắn, mà lại có màng, mỏ bẹt màu vàng, hay kêu cạp cạp?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Con vịt', isCorrect: true },
                                { text: 'Con gà', isCorrect: false },
                                { text: 'Con chó', isCorrect: false },
                                { text: 'Con mèo', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Đố vui thông minh',
                    description: 'Thử thách IQ với những câu đố hóc búa.',
                    image: 'https://images.unsplash.com/photo-1590012357758-bb2415bca612?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Cái gì càng thui càng ngắn?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Bút chì', isCorrect: true },
                                { text: 'Cái cây', isCorrect: false },
                                { text: 'Sông', isCorrect: false },
                                { text: 'Con đường', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Nhìn hình đoán chữ',
                    description: 'Sáng tạo và liên tưởng với các hình ảnh.',
                    image: 'https://images.unsplash.com/photo-1532012197367-2bd1618037c7?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Hình ảnh một con ngựa và một chiếc xe. Đáp án là gì?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Xe ngựa', isCorrect: true },
                                { text: 'Ngựa xe', isCorrect: false },
                                { text: 'Đua ngựa', isCorrect: false },
                                { text: 'Mã xa', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Kiến thức tổng hợp nhanh',
                    description: 'Trả lời nhanh các câu hỏi đa lĩnh vực.',
                    image: 'https://images.unsplash.com/photo-1518331647614-7a1fb05029ca?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: 'Một năm nhuận có bao nhiêu ngày?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: '366 ngày', isCorrect: true },
                                { text: '365 ngày', isCorrect: false },
                                { text: '364 ngày', isCorrect: false },
                                { text: '367 ngày', isCorrect: false },
                            ],
                        }
                    ]
                },
                {
                    title: 'Câu thơ đố chữ',
                    description: 'Những vần thơ ẩn chứa đáp án bất ngờ.',
                    image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=800&q=80',
                    questions: [
                        {
                            text: '"Da trắng muốt, ruột trắng tinh, thân hình tròn trịa, ai ai cũng dùng?" là cái gì?',
                            type: QuestionType.BUTTONS,
                            options: [
                                { text: 'Viên phấn', isCorrect: true },
                                { text: 'Tờ giấy', isCorrect: false },
                                { text: 'Cái bát', isCorrect: false },
                                { text: 'Quả trứng', isCorrect: false },
                            ],
                        }
                    ]
                }
            ]
        }
    ];

    for (const data of quizData) {
        const category = categories[data.category];
        for (const q of data.quizzes) {
            const quiz = await prisma.quiz.create({
                data: {
                    title: q.title,
                    description: q.description,
                    image: q.image,
                    isPublic: true,
                    creatorId: teacher.id,
                    categoryId: category.id,
                },
            });

            for (const ques of q.questions) {
                if (ques.type === QuestionType.BUTTONS) {
                    await prisma.question.create({
                        data: {
                            text: ques.text,
                            type: ques.type,
                            quizId: quiz.id,
                            options: {
                                create: ques.options || [],
                            },
                        },
                    });
                } else {
                    await prisma.question.create({
                        data: {
                            text: ques.text,
                            type: ques.type,
                            quizId: quiz.id,
                            data: (ques as any).data || {},
                        },
                    });
                }
            }
        }
    }

    console.log('Đã tạo các Quiz mẫu cho từng danh mục với hình ảnh.');

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

    console.log('Đã cập nhật các gói SaaS và tính năng.');

    // 5. Tạo chiến dịch khuyến mãi: Gói Giáo Viên miễn phí đến hết tháng 9/2026
    console.log('Seeding promotions...');
    const teacherPlan = await prisma.plan.findUnique({ where: { type: PlanType.TEACHER_PRO } });

    if (teacherPlan) {
        // Xóa promotion cũ cùng title nếu có (để seed lại được clean)
        await prisma.promotion.deleteMany({
            where: { title: 'Gói Giáo Viên - MIỄN PHÍ! 🎉' },
        });

        await prisma.promotion.create({
            data: {
                title: 'Gói Giáo Viên - MIỄN PHÍ! 🎉',
                subtitle: 'Ưu đãi đặc biệt cho giáo viên — áp dụng đến hết tháng 9/2026',
                description: 'Nhân dịp ra mắt nền tảng Quizmon, chúng tôi tặng miễn phí gói Giáo Viên cho tất cả giáo viên đăng ký trước ngày 30/09/2026. Không cần thẻ tín dụng, kích hoạt ngay!',
                planId: teacherPlan.id,
                discountedPriceMonthly: 0,
                discountedPriceYearly: 0,
                expiresAt: new Date('2026-09-30T23:59:59.000Z'),
                isActive: true,
                isPublished: true,
                bannerColor: '#0078D4',
                badgeText: 'MIỄN PHÍ',
            },
        });

        console.log('Đã tạo chiến dịch khuyến mãi: Gói Giáo Viên miễn phí đến 30/09/2026.');
    } else {
        console.warn('Không tìm thấy gói TEACHER_PRO, bỏ qua seed promotion.');
    }

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
