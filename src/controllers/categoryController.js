import prisma from "../prismaClient.js";

export const createCategory = async (req, res) => {
  const { name } = req.body;

  try {
    const newCategory = await prisma.quizCategory.create({
      data: {
        name
      },
    });

    return res.status(201).json(newCategory);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

export const getCategory = async (req, res) => {
  try {
    const categories = await prisma.quizCategory.findMany();

    return res.status(200).json(categories);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

export const getQuizByCate = async (req, res) => {
  try {
    const { id } = req.params;

    const quizzes = await prisma.quiz.findMany({
      where: {
        categoryId: Number(id),
        isPublic: true
      },
      include: {
        creator: {
            select: {id: true, username: true}
        }
      }
    })

    return res.status(200).json(quizzes);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};
