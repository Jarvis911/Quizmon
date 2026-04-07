import { Request, Response } from 'express';
import prisma from '../prismaClient.js';
import ExcelJS from 'exceljs';

export const generateExcelReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchId } = req.params;
        const userId = req.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const match = await prisma.match.findUnique({
            where: { id: Number(matchId) },
            include: {
                quiz: { select: { title: true, description: true } },
                participants: {
                    include: { answers: true }
                },
                matchResults: {
                    include: { user: { select: { username: true, email: true } } }
                }
            }
        });

        if (!match) {
            res.status(404).json({ message: 'Match not found' });
            return;
        }

        const requesterId = Number(userId);
        const isHost = match.hostId === requesterId;
        const isParticipant =
            (match.participants ?? []).some(p => p.userId === requesterId) ||
            (match.matchResults ?? []).some(mr => mr.userId === requesterId);

        // Host can export full report; participants can export their own (non-classroom and homework).
        if (!isHost && !isParticipant) {
            res.status(403).json({ message: 'You do not have permission to export this report' });
            return;
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Quizmon LMS';
        workbook.created = new Date();

        // ---------------- Sheet 1: Overview ----------------
        const overviewSheet = workbook.addWorksheet('Overview');
        overviewSheet.columns = [
            { header: 'Property', key: 'prop', width: 25 },
            { header: 'Value', key: 'val', width: 50 }
        ];

        overviewSheet.addRow({ prop: 'Quiz Title', val: match.quiz.title });
        overviewSheet.addRow({ prop: 'Description', val: match.quiz.description });
        overviewSheet.addRow({ prop: 'Match Mode', val: match.mode });
        overviewSheet.addRow({ prop: 'Total Participants', val: match.participants.length });
        overviewSheet.addRow({ prop: 'Started At', val: match.createdAt });
        overviewSheet.addRow({ prop: 'Deadline', val: match.deadline || 'None' });

        // Make headers bold
        overviewSheet.getRow(1).font = { bold: true };


        // ---------------- Sheet 2: Learner Results ----------------
        const resultsSheet = workbook.addWorksheet('Learner Results');
        resultsSheet.columns = [
            { header: 'User ID', key: 'userId', width: 12 },
            { header: 'Participant Name', key: 'name', width: 30 },
            { header: 'Email (if logged in)', key: 'email', width: 30 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Joined At', key: 'joined', width: 25 },
            { header: 'Time Taken', key: 'time', width: 20 },
            { header: 'Total Score', key: 'score', width: 15 }
        ];
        resultsSheet.getRow(1).font = { bold: true };

        const participantsByUserId = new Map<number, typeof match.participants[number]>();
        for (const p of match.participants) {
            if (p.userId) participantsByUserId.set(p.userId, p);
        }

        const resultByUserId = new Map<number, typeof match.matchResults[number]>();
        for (const mr of match.matchResults) {
            resultByUserId.set(mr.userId, mr);
        }

        // If requester is not host, only export their own row to avoid leaking classroom/other players data.
        if (!isHost) {
            const p = participantsByUserId.get(requesterId);
            const mr = resultByUserId.get(requesterId);

            let timeTaken = 'N/A';
            if (p?.startTime && p?.endTime) {
                const diffMs = p.endTime.getTime() - p.startTime.getTime();
                timeTaken = `${Math.floor(diffMs / 60000)}m ${Math.floor((diffMs % 60000) / 1000)}s`;
            }

            const totalScore = p ? p.answers.reduce((acc, ans) => acc + ans.score, 0) : (mr?.score ?? 0);

            resultsSheet.addRow({
                userId: requesterId,
                name: p?.displayName || mr?.user?.username || 'Player',
                email: mr?.user?.email || 'N/A',
                status: p?.status || 'N/A',
                joined: p?.joinedAt ? p.joinedAt.toLocaleString() : 'N/A',
                time: timeTaken,
                score: totalScore,
            });
        }
        // Host exporting classroom homework: include *all* students, even if not started.
        else if (match.classroomId && match.mode === 'HOMEWORK') {
            const classroomStudents = await prisma.classroomMember.findMany({
                where: {
                    classroomId: match.classroomId,
                    role: 'STUDENT',
                },
                include: {
                    user: { select: { id: true, username: true, email: true } }
                },
                orderBy: { joinDate: 'asc' }
            });

            for (const member of classroomStudents) {
                const p = participantsByUserId.get(member.user.id);
                const mr = resultByUserId.get(member.user.id);

                let timeTaken = 'N/A';
                if (p?.startTime && p?.endTime) {
                    const diffMs = p.endTime.getTime() - p.startTime.getTime();
                    timeTaken = `${Math.floor(diffMs / 60000)}m ${Math.floor((diffMs % 60000) / 1000)}s`;
                }

                const totalScore = p ? p.answers.reduce((acc, ans) => acc + ans.score, 0) : 0;

                resultsSheet.addRow({
                    userId: member.user.id,
                    name: p?.displayName || member.user.username || 'Student',
                    email: mr?.user?.email || member.user.email || 'N/A',
                    status: p?.status || 'NOT_STARTED',
                    joined: p?.joinedAt ? p.joinedAt.toLocaleString() : 'N/A',
                    time: timeTaken,
                    score: totalScore
                });
            }
        } else {
            // Non-classroom matches: report only participants
            for (const p of match.participants) {
                const mr = p.userId ? resultByUserId.get(p.userId) : undefined;

                let timeTaken = 'N/A';
                if (p.startTime && p.endTime) {
                    const diffMs = p.endTime.getTime() - p.startTime.getTime();
                    timeTaken = `${Math.floor(diffMs / 60000)}m ${Math.floor((diffMs % 60000) / 1000)}s`;
                }

                const totalScore = p.answers.reduce((acc, ans) => acc + ans.score, 0);

                resultsSheet.addRow({
                    userId: p.userId ?? '',
                    name: p.displayName || 'Anonymous',
                    email: mr?.user?.email || 'Guest',
                    status: p.status,
                    joined: p.joinedAt ? p.joinedAt.toLocaleString() : 'N/A',
                    time: timeTaken,
                    score: totalScore
                });
            }
        }

        // Setup response headers for download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="quizmon_report_${match.id}.xlsx"`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export report error:', error);
        res.status(500).json({ message: 'Internal server error while generating report' });
    }
};
