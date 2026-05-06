import { Request, Response } from 'express';
import prisma from '../prismaClient.js';
import { notificationService } from '../services/notificationService.js';
import { canUseFeature } from '../services/featureGateService.js';
import { FeatureKey } from '@prisma/client';
import crypto from 'crypto';
import { createRequire } from 'module';
import ExcelJS from 'exceljs';
import { extractStudentList } from '../services/aiService.js';

const _require = createRequire(import.meta.url);
const pdfParse = _require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
const mammoth = _require('mammoth') as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };

// Create a new classroom
export const createClassroom = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, description } = req.body;
        const userId = req.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const inviteLink = crypto.randomUUID();

        const orgId = req.organizationId;
        if (!orgId) {
            res.status(403).json({ message: 'Bạn cần tham gia một tổ chức hoặc có gói cá nhân để tạo lớp học.' });
            return;
        }

        const { allowed, limit } = await canUseFeature(orgId, FeatureKey.MAX_CLASSROOMS);
        if (!allowed) {
            res.status(403).json({ message: 'Tính năng tạo lớp học không có sẵn trong gói hiện tại của bạn.' });
            return;
        }

        if (limit !== null) {
            const classroomCount = await prisma.classroom.count({
                where: { organizationId: orgId }
            });

            if (classroomCount >= limit) {
                res.status(403).json({ message: `Bạn đã đạt giới hạn tối đa ${limit} lớp học cho tổ chức này.` });
                return;
            }
        }

        const classroom = await prisma.classroom.create({
            data: {
                name,
                description,
                joinCode,
                inviteLink,
                teacherId: Number(userId),
                organizationId: req.organizationId ?? null,
                members: {
                    create: {
                        userId: Number(userId),
                        role: 'TEACHER',
                        status: 'APPROVED'
                    }
                }
            }
        });

        await notificationService.createNotification(
            Number(userId),
            `Bạn đã tạo thành công lớp học: ${classroom.name}`,
            'CLASSROOM_CREATED',
            `/classrooms/${classroom.joinCode}`
        );

        res.status(201).json(classroom);
    } catch (error) {
        console.error('Create classroom error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get classrooms the user is a member of
export const getClassrooms = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const classrooms = await prisma.classroom.findMany({
            where: {
                members: {
                    some: { userId: Number(userId) }
                },
                OR: [
                    ...(req.organizationId ? [{ organizationId: req.organizationId }] : []),
                    {
                        members: {
                            some: {
                                userId: Number(userId),
                                role: 'STUDENT'
                            }
                        }
                    }
                ]
            },
            include: {
                teacher: {
                    select: { id: true, username: true, email: true }
                },
                _count: {
                    select: {
                        members: {
                            where: { status: 'APPROVED' }
                        },
                        assignments: true,
                        expectedStudents: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(classrooms);
    } catch (error) {
        console.error('Get classrooms error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get a specific classroom by joinCode (6-char code) or numeric ID (legacy)
export const getClassroomById = async (req: Request, res: Response): Promise<void> => {
    try {
        const code = String(req.params.code ?? req.params.id ?? '');
        const userId = req.userId;

        // Accept both joinCode (6-char alphanumeric) and numeric DB id (legacy)
        const isNumericId = /^\d+$/.test(code);
        const classroom = await prisma.classroom.findUnique({
            where: isNumericId ? { id: parseInt(code) } : { joinCode: code.toUpperCase() },
            include: {
                teacher: { select: { id: true, username: true, email: true } },
                members: {
                    include: {
                        user: { select: { id: true, username: true, email: true, avatarUrl: true } }
                    },
                    orderBy: { joinDate: 'asc' }
                },
                expectedStudents: {
                    include: {
                        matchedUser: { select: { id: true, username: true, email: true } }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                assignments: {
                    include: {
                        quiz: { select: { id: true, title: true, image: true, category: true } },
                        participants: {
                            where: { status: { in: ['SUBMITTED', 'LATE'] } },
                            select: {
                                userId: true,
                                status: true,
                                startTime: true,
                                endTime: true,
                                answers: {
                                    select: { isCorrect: true, score: true, timeTaken: true }
                                }
                            }
                        },
                        _count: {
                            select: { participants: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!classroom) {
            res.status(404).json({ message: 'Classroom not found' });
            return;
        }

        const isMember = classroom.members.some((member: { userId: number }) => member.userId === Number(userId));
        if (!isMember) {
            res.status(403).json({ message: 'You are not a member of this classroom' });
            return;
        }

        res.status(200).json(classroom);
    } catch (error) {
        console.error('Get classroom error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Join a classroom by code (creates PENDING member)
export const joinClassroom = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code } = req.body;
        const userId = req.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        if (!code) {
            res.status(400).json({ message: 'Join code is required' });
            return;
        }

        const classroom = await prisma.classroom.findUnique({
            where: { joinCode: code.toUpperCase() }
        });

        if (!classroom) {
            res.status(404).json({ message: 'Mã lớp không hợp lệ' });
            return;
        }

        if (classroom.organizationId) {
            const { allowed, limit } = await canUseFeature(classroom.organizationId, FeatureKey.MAX_STUDENTS_PER_CLASSROOM);
            if (allowed && limit !== null) {
                const studentCount = await prisma.classroomMember.count({
                    where: { classroomId: classroom.id, role: 'STUDENT', status: 'APPROVED' }
                });

                if (studentCount >= limit) {
                    res.status(403).json({ message: `Lớp học này đã đạt giới hạn tối đa ${limit} học sinh.` });
                    return;
                }
            }
        }

        const existingMember = await prisma.classroomMember.findUnique({
            where: {
                classroomId_userId: {
                    classroomId: classroom.id,
                    userId: Number(userId)
                }
            }
        });

        if (existingMember) {
            if (existingMember.status === 'PENDING') {
                res.status(400).json({ message: 'Yêu cầu của bạn đang chờ giáo viên duyệt.' });
            } else {
                res.status(400).json({ message: 'Bạn đã là thành viên của lớp học này.' });
            }
            return;
        }

        const member = await prisma.classroomMember.create({
            data: {
                classroomId: classroom.id,
                userId: Number(userId),
                role: 'STUDENT',
                status: 'PENDING'
            },
            include: {
                user: { select: { username: true } }
            }
        });

        await notificationService.createNotification(
            Number(userId),
            `Yêu cầu tham gia lớp "${classroom.name}" đang chờ giáo viên duyệt.`,
            'CLASSROOM_PENDING',
            `/classrooms/${classroom.joinCode}`
        );

        await notificationService.createNotification(
            classroom.teacherId,
            `Học sinh ${member.user.username || 'mới'} xin tham gia lớp: ${classroom.name}`,
            'STUDENT_JOIN_REQUEST',
            `/classrooms/${classroom.joinCode}`
        );

        res.status(201).json({ message: 'Yêu cầu đã được gửi. Vui lòng chờ giáo viên duyệt.', status: 'PENDING' });
    } catch (error) {
        console.error('Join classroom error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Join classroom by invite link token
export const joinByInviteLink = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = String(req.params.token);
        const userId = req.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const classroom = await prisma.classroom.findUnique({
            where: { inviteLink: token }
        });

        if (!classroom) {
            res.status(404).json({ message: 'Link mời không hợp lệ hoặc đã hết hạn.' });
            return;
        }

        const existingMember = await prisma.classroomMember.findUnique({
            where: {
                classroomId_userId: { classroomId: classroom.id, userId: Number(userId) }
            }
        });

        if (existingMember) {
            if (existingMember.status === 'APPROVED') {
                res.status(200).json({ message: 'Bạn đã là thành viên của lớp này.', classroomId: classroom.id, alreadyMember: true });
            } else {
                res.status(400).json({ message: 'Yêu cầu của bạn đang chờ duyệt.', status: 'PENDING' });
            }
            return;
        }

        const member = await prisma.classroomMember.create({
            data: {
                classroomId: classroom.id,
                userId: Number(userId),
                role: 'STUDENT',
                status: 'PENDING'
            },
            include: { user: { select: { username: true } } }
        });

        await notificationService.createNotification(
            classroom.teacherId,
            `Học sinh ${member.user.username || 'mới'} xin tham gia lớp: ${classroom.name} (qua link mời)`,
            'STUDENT_JOIN_REQUEST',
            `/classrooms/${classroom.joinCode}`
        );

        res.status(201).json({
            message: 'Yêu cầu tham gia đã được gửi. Vui lòng chờ giáo viên duyệt.',
            classroomId: classroom.id,
            classroomName: classroom.name,
            status: 'PENDING'
        });
    } catch (error) {
        console.error('Join by invite link error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Teacher approves a pending member
export const approveMember = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        const memberId = String(req.params.memberId);
        const userId = req.userId;

        const classroom = await prisma.classroom.findUnique({ where: { id: parseInt(id) } });
        if (!classroom) {
            res.status(404).json({ message: 'Lớp học không tồn tại.' });
            return;
        }

        if (classroom.teacherId !== Number(userId)) {
            res.status(403).json({ message: 'Chỉ giáo viên mới có thể duyệt thành viên.' });
            return;
        }

        const member = await prisma.classroomMember.update({
            where: { id: parseInt(memberId) },
            data: { status: 'APPROVED' },
            include: { user: { select: { id: true, username: true, email: true } } }
        });

        // Try to auto-match the approved student against the expected student list
        // Priority: email -> studentCode (if user embeds it) -> name (fuzzy)
        const username = member.user.username ?? '';
        const email = member.user.email ?? '';
        const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

        const expectedStudents = await prisma.expectedStudent.findMany({
            where: { classroomId: classroom.id, matchedUserId: null }
        });

        let matched = undefined as (typeof expectedStudents[number]) | undefined;

        if (email) {
            const normalizedEmail = email.toLowerCase().trim();
            matched = expectedStudents.find(es => (es.email ?? '').toLowerCase().trim() === normalizedEmail);
        }

        // If your system stores student code inside username (e.g. "22001234 - Nguyen Van A"), try to match codes too
        if (!matched && username) {
            const codeMatch = username.match(/\b([A-Z0-9]{4,12})\b/);
            const maybeCode = codeMatch?.[1];
            if (maybeCode) {
                const normalizedCode = maybeCode.toUpperCase();
                matched = expectedStudents.find(es => (es.studentCode ?? '').toUpperCase() === normalizedCode);
            }
        }

        if (!matched && username) {
            const normalizedUsername = normalize(username);
            matched = expectedStudents.find(es => {
                const normalizedExpected = normalize(es.name);
                return normalizedExpected === normalizedUsername ||
                    normalizedUsername.includes(normalizedExpected) ||
                    normalizedExpected.includes(normalizedUsername);
            });
        }

        if (matched) {
            await prisma.expectedStudent.update({
                where: { id: matched.id },
                data: { matchedUserId: member.user.id }
            });
        }

        await notificationService.createNotification(
            member.user.id,
            `Yêu cầu tham gia lớp "${classroom.name}" đã được duyệt!`,
            'CLASSROOM_APPROVED',
            `/classrooms/${classroom.joinCode}`
        );

        res.status(200).json({ message: 'Đã duyệt thành viên.', member });
    } catch (error) {
        console.error('Approve member error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Teacher rejects a pending member
export const rejectMember = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        const memberId = String(req.params.memberId);
        const userId = req.userId;

        const classroom = await prisma.classroom.findUnique({ where: { id: parseInt(id) } });
        if (!classroom) {
            res.status(404).json({ message: 'Lớp học không tồn tại.' });
            return;
        }

        if (classroom.teacherId !== Number(userId)) {
            res.status(403).json({ message: 'Chỉ giáo viên mới có thể từ chối thành viên.' });
            return;
        }

        const member = await prisma.classroomMember.findUnique({
            where: { id: parseInt(memberId) },
            include: { user: { select: { id: true, username: true } } }
        });

        if (!member) {
            res.status(404).json({ message: 'Thành viên không tồn tại.' });
            return;
        }

        await prisma.classroomMember.delete({ where: { id: parseInt(memberId) } });

        await notificationService.createNotification(
            member.user.id,
            `Yêu cầu tham gia lớp "${classroom.name}" đã bị từ chối.`,
            'CLASSROOM_REJECTED',
            ''
        );

        res.status(200).json({ message: 'Đã từ chối yêu cầu.' });
    } catch (error) {
        console.error('Reject member error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Teacher removes a member from classroom
export const removeMember = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        const targetUserId = String(req.params.userId);
        const userId = req.userId;

        const classroom = await prisma.classroom.findUnique({ where: { id: parseInt(id) } });
        if (!classroom) {
            res.status(404).json({ message: 'Lớp học không tồn tại.' });
            return;
        }

        if (classroom.teacherId !== Number(userId)) {
            res.status(403).json({ message: 'Chỉ giáo viên mới có thể xóa thành viên.' });
            return;
        }

        if (parseInt(targetUserId) === classroom.teacherId) {
            res.status(400).json({ message: 'Không thể xóa giáo viên khỏi lớp.' });
            return;
        }

        await prisma.classroomMember.deleteMany({
            where: {
                classroomId: parseInt(id),
                userId: parseInt(targetUserId)
            }
        });

        res.status(200).json({ message: 'Đã xóa học sinh khỏi lớp.' });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Teacher manually matches an expected student to a real user (1-1 within classroom)
export const matchExpectedStudent = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        const expectedId = String(req.params.expectedId);
        const targetUserId = String(req.params.userId);
        const userId = req.userId;

        const classroom = await prisma.classroom.findUnique({ where: { id: parseInt(id) } });
        if (!classroom) {
            res.status(404).json({ message: 'Lớp học không tồn tại.' });
            return;
        }
        if (classroom.teacherId !== Number(userId)) {
            res.status(403).json({ message: 'Chỉ giáo viên mới có thể ghép danh sách.' });
            return;
        }

        const expected = await prisma.expectedStudent.findUnique({ where: { id: parseInt(expectedId) } });
        if (!expected || expected.classroomId !== classroom.id) {
            res.status(404).json({ message: 'Học sinh dự kiến không tồn tại.' });
            return;
        }

        const member = await prisma.classroomMember.findFirst({
            where: {
                classroomId: classroom.id,
                userId: parseInt(targetUserId),
                status: 'APPROVED'
            }
        });
        if (!member) {
            res.status(400).json({ message: 'Tài khoản này chưa là thành viên đã duyệt của lớp.' });
            return;
        }

        // Ensure one-to-one: clear any other expected student already matched to this user in this classroom
        await prisma.expectedStudent.updateMany({
            where: { classroomId: classroom.id, matchedUserId: parseInt(targetUserId) },
            data: { matchedUserId: null }
        });

        const updated = await prisma.expectedStudent.update({
            where: { id: expected.id },
            data: { matchedUserId: parseInt(targetUserId) },
            include: { matchedUser: { select: { id: true, username: true, email: true } } }
        });

        res.status(200).json({ message: 'Đã ghép thủ công.', expectedStudent: updated });
    } catch (error) {
        console.error('Match expected student error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const unmatchExpectedStudent = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        const expectedId = String(req.params.expectedId);
        const userId = req.userId;

        const classroom = await prisma.classroom.findUnique({ where: { id: parseInt(id) } });
        if (!classroom) {
            res.status(404).json({ message: 'Lớp học không tồn tại.' });
            return;
        }
        if (classroom.teacherId !== Number(userId)) {
            res.status(403).json({ message: 'Chỉ giáo viên mới có thể bỏ ghép.' });
            return;
        }

        const expected = await prisma.expectedStudent.findUnique({ where: { id: parseInt(expectedId) } });
        if (!expected || expected.classroomId !== classroom.id) {
            res.status(404).json({ message: 'Học sinh dự kiến không tồn tại.' });
            return;
        }

        const updated = await prisma.expectedStudent.update({
            where: { id: expected.id },
            data: { matchedUserId: null },
            include: { matchedUser: { select: { id: true, username: true, email: true } } }
        });

        res.status(200).json({ message: 'Đã bỏ ghép.', expectedStudent: updated });
    } catch (error) {
        console.error('Unmatch expected student error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Import expected students from PDF/Word/Excel/Image via Gemini OCR
export const importExpectedStudents = async (req: Request, res: Response): Promise<void> => {
    try {
        const raw = String(req.params.id ?? '');
        const userId = req.userId;
        const file = req.file;

        if (!file) {
            res.status(400).json({ message: 'Vui lòng upload file (PDF, Word, Excel hoặc ảnh).' });
            return;
        }

        const isNumericId = /^\d+$/.test(raw);
        const classroom = await prisma.classroom.findUnique({
            where: isNumericId ? { id: parseInt(raw) } : { joinCode: raw.toUpperCase() }
        });
        if (!classroom) {
            res.status(404).json({ message: 'Lớp học không tồn tại.' });
            return;
        }

        if (classroom.teacherId !== Number(userId)) {
            res.status(403).json({ message: 'Chỉ giáo viên mới có thể import danh sách.' });
            return;
        }

        const mime = file.mimetype;
        let textContent: string | null = null;
        let imageBuffer: Buffer | null = null;
        let imageMimeType = 'image/jpeg';

        // ── Extract raw content by file type ──────────────────────────────
        if (mime === 'application/pdf') {
            const parsed = await pdfParse(file.buffer);
            textContent = parsed.text;
        } else if (
            mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mime === 'application/msword'
        ) {
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            textContent = result.value;
        } else if (
            mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            mime === 'application/vnd.ms-excel'
        ) {
            const workbook = new ExcelJS.Workbook();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await workbook.xlsx.load(file.buffer as any);
            const lines: string[] = [];
            workbook.eachSheet((sheet: ExcelJS.Worksheet) => {
                sheet.eachRow((row: ExcelJS.Row) => {
                    const vals = (row.values as (string | number | null | undefined)[])
                        .slice(1)
                        .map(v => (v == null ? '' : String(v).trim()))
                        .filter(Boolean);
                    if (vals.length) lines.push(vals.join(' | '));
                });
            });
            textContent = lines.join('\n');
        } else if (mime === 'text/csv') {
            textContent = file.buffer.toString('utf-8');
        } else if (mime.startsWith('image/')) {
            imageBuffer = file.buffer;
            imageMimeType = mime;
        } else {
            res.status(400).json({ message: `Định dạng ${mime} không được hỗ trợ.` });
            return;
        }

        // ── Call Gemini to extract student names ───────────────────────────
        const students = await extractStudentList(textContent, imageBuffer, imageMimeType);

        if (students.length === 0) {
            res.status(400).json({
                message: 'Không tìm thấy tên học sinh trong file. Hãy kiểm tra định dạng hoặc thử file khác.'
            });
            return;
        }

        // ── Persist to DB ─────────────────────────────────────────────────
        const created = await Promise.all(
            students.map(s =>
                prisma.expectedStudent.create({
                    data: {
                        name: s.name,
                        studentCode: s.studentCode ?? null,
                        email: s.email ?? null,
                        classroomId: classroom.id
                    }
                })
            )
        );

        res.status(201).json({
            message: `Đã import ${created.length} học sinh.`,
            count: created.length,
            students: created
        });
    } catch (error) {
        console.error('Import expected students error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


// Delete all expected students and re-import
export const clearExpectedStudents = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        const userId = req.userId;

        const classroom = await prisma.classroom.findUnique({ where: { id: parseInt(id) } });
        if (!classroom || classroom.teacherId !== Number(userId)) {
            res.status(403).json({ message: 'Không có quyền.' });
            return;
        }

        await prisma.expectedStudent.deleteMany({ where: { classroomId: parseInt(id) } });
        res.status(200).json({ message: 'Đã xóa toàn bộ danh sách dự kiến.' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get pending join requests
export const getPendingMembers = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        const userId = req.userId;

        const classroom = await prisma.classroom.findUnique({ where: { id: parseInt(id) } });
        if (!classroom || classroom.teacherId !== Number(userId)) {
            res.status(403).json({ message: 'Chỉ giáo viên mới có thể xem danh sách chờ duyệt.' });
            return;
        }

        const pending = await prisma.classroomMember.findMany({
            where: { classroomId: parseInt(id), status: 'PENDING', role: 'STUDENT' },
            include: {
                user: { select: { id: true, username: true, email: true, avatarUrl: true } }
            },
            orderBy: { joinDate: 'asc' }
        });

        res.status(200).json(pending);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Regenerate invite link
export const regenerateInviteLink = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        const userId = req.userId;

        const classroom = await prisma.classroom.findUnique({ where: { id: parseInt(id) } });
        if (!classroom || classroom.teacherId !== Number(userId)) {
            res.status(403).json({ message: 'Không có quyền.' });
            return;
        }

        const newInviteLink = crypto.randomUUID();
        const updated = await prisma.classroom.update({
            where: { id: parseInt(id) },
            data: { inviteLink: newInviteLink }
        });

        res.status(200).json({ inviteLink: updated.inviteLink });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
