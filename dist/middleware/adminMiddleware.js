import prisma from '../prismaClient.js';
const adminMiddleware = async (req, res, next) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
            select: { isAdmin: true }
        });
        if (!user || !user.isAdmin) {
            res.status(403).json({ message: 'Forbidden: Admin access required' });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export default adminMiddleware;
