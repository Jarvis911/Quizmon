import prisma from "../prismaClient.js";

export const createMatch = async (req, res) => {
  try {
    const { quizId } = req.body;
    const hostId = req.userId;
    const match = await prisma.match.create({
      data: {
        quizId: Number(quizId),
        hostId: Number(hostId),
      },
    });

    res.status(201).json(match);
  } catch (err) {
    res.status(500).json(err);
  }
};

export const getMatch = async (req, res) => {
  try {
    const { id } = req.params;

    const match = await prisma.match.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                button: true,
                checkbox: true,
                reorder: true,
                range: true,
                typeAnswer: true,
                location: true,
                media: true,
                options: true,
              },
            },
            category: {
              select: { id: true, name: true },
            },
          },
        },
        host: true,
        matchResults: true,
      },
    });

    res.status(200).json(match);
  } catch (err) {
    res.status(500).json(err);
  }
};

export const updateMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await prisma.match.update({
      where: {
        id: Number(matchId),
      },
      data,
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                button: true,
                checkbox: true,
                reorder: true,
                range: true,
                typeAnswer: true,
                location: true,
                media: true,
                options: true,
              },
            },
            category: {
              select: { id: true, name: true },
            },
          },
        },
        host: true,
        matchResults: true,
      },
    });
    
    res.status(200).json(match);
  } catch (err) {
    res.status(500).json(err);
  }
};
