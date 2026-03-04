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

        // Must be the host/teacher to export report
        if (match.hostId !== Number(userId)) {
            res.status(403).json({ message: 'Only the host can export reports' });
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
            { header: 'Participant Name', key: 'name', width: 30 },
            { header: 'Email (if logged in)', key: 'email', width: 30 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Joined At', key: 'joined', width: 25 },
            { header: 'Time Taken', key: 'time', width: 20 },
            { header: 'Total Score', key: 'score', width: 15 }
        ];
        resultsSheet.getRow(1).font = { bold: true };

        match.participants.forEach(p => {
            // Match result mapping to get email if available
            const result = match.matchResults.find(mr => mr.userId === p.userId);
            let timeTaken = 'N/A';
            if (p.startTime && p.endTime) {
                const diffMs = p.endTime.getTime() - p.startTime.getTime();
                timeTaken = `${Math.floor(diffMs / 60000)}m ${Math.floor((diffMs % 60000) / 1000)}s`;
            }

            const totalScore = p.answers.reduce((acc, ans) => acc + ans.score, 0);

            resultsSheet.addRow({
                name: p.displayName || 'Anonymous',
                email: result?.user?.email || 'Guest',
                status: p.status,
                joined: p.joinedAt ? p.joinedAt.toLocaleString() : 'N/A',
                time: timeTaken,
                score: totalScore
            });
        });

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
