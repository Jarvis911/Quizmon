import prisma from "../prismaClient.js";

export const createQuestion = async (questionData) => {
  try {
    const {
      quizId,
      text,
      type,
      media,
      options,
      minValue,
      maxValue,
      correctValue,
      correctAnswer,
      correctLatitude,
      correctLongitude,
    } = questionData;

    const question = await prisma.question.create({
      data: {
        text,
        type,
        quizId,
        ...(type === "BUTTONS" && { button: { create: {} } }),
        ...(type === "CHECKBOXES" && { checkbox: { create: {} } }),
        ...(type === "REORDER" && { reorder: { create: {} } }),
        // If it is range, create child Range with additional value
        ...(type === "RANGE" && {
          range: {
            create: {
              minValue,
              maxValue,
              correctValue,
            },
          },
        }),
        // If it is type answer, create child TypeAnswer with additional value
        ...(type === "TYPEANSWER" && {
          typeAnswer: {
            create: { correctAnswer },
          },
        }),
        // If it is location, create child Location with additional value
        ...(type === "LOCATION" && {
          location: {
            create: {
              correctLatitude,
              correctLongitude,
            },
          },
        }),
        media: {
          // In case want to open to upload multiple images
          create: media.map((m) => ({
            type: m.type,
            url: m.url,
            startTime: m.startTime,
            duration: m.duration,
          })),
        },
        // Create options if options type
        options: options && {
          create: options.map((option) => ({
            text: option.text,
            isCorrect: option.isCorrect || false,
            order: option.order,
          })),
        },
      },
      // Return following child 
      include: {
        button: true,
        checkbox: true,
        reorder: true,
        range: true,
        typeAnswer: true,
        location: true,
        media: true,
        options: true,
        quiz: {
          select: { id: true, title: true },
        },
      },
    });

    return question;
  } catch (err) {
    console.error(err.message);
    throw err;
  }
};

export const updateQuestion = async (id, questionData) => {
  try {
    const {
      text,
      type,
      media = [],
      options = [],
      minValue,
      maxValue,
      correctValue,
      correctAnswer,
      correctLatitude,
      correctLongitude,
    } = questionData;

    const updated = await prisma.question.update({
      where: { id: Number(id) },
      data: {
        text,
        type,

        // Range
        ...(type === "RANGE" && {
          range: {
            upsert: {
              update: { minValue, maxValue, correctValue },
              create: { minValue, maxValue, correctValue },
            },
          },
        }),

        // Type Answer
        ...(type === "TYPEANSWER" && {
          typeAnswer: {
            upsert: {
              update: { correctAnswer },
              create: { correctAnswer },
            },
          },
        }),

        // Location
        ...(type === "LOCATION" && {
          location: {
            upsert: {
              update: { correctLatitude, correctLongitude },
              create: { correctLatitude, correctLongitude },
            },
          },
        }),

        // Media (xóa cũ -> tạo mới)
        media: {
          deleteMany: {}, 
          create: media.map((m) => ({
            type: m.type,
            url: m.url,
            startTime: m.startTime,
            duration: m.duration,
          })),
        },

        // Options (xóa cũ -> tạo mới)
        options: {
          deleteMany: {},
          create: options.map((o) => ({
            text: o.text,
            isCorrect: o.isCorrect || false,
            order: o.order,
          })),
        },
      },
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
    });

    return updated;
  } catch (err) {
    console.error(err.message);
    throw err;
  }
};