import {
  createQuestion as createQuestionService,
  updateQuestion as updateQuestionService,
} from "../services/questionService.js";
import { uploadMedia } from "../services/uploadMediaService.js";
import prisma from "../prismaClient.js";

// Get retrieve question 
export const getRetrieveQuestion = async (req, res) => {
  const { id } = req.params;
  try {
    const question = await prisma.question.findMany({
      where: {
        id: Number(id),
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
        quiz: {
          select: { id: true, title: true },
        },
      },
    });

    return res.status(200).json(question);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error during getting the question" });
  }
};

// Button question
export const createButtonQuestion = async (req, res) => {
  const { quizId, text, options, videos } = req.body;
  const files = req.files;

  try {
    const questionMedia = await uploadMedia(
      files ? files : null,
      videos ? JSON.parse(videos) : null
    );

    const questionData = {
      quizId: parseInt(quizId),
      text,
      type: "BUTTONS",
      media: questionMedia,
      options: JSON.parse(options),
    };

    const newQuestion = await createQuestionService(questionData);
    return res.status(201).json(newQuestion);
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ message: "Server error during button question creation" });
  }
};

export const updateButtonQuestion = async (req, res) => {
  const { quizId, text, options, videos } = req.body;
  const { id } = req.params;
  const files = req.files;
  try {
    const questionMedia = await uploadMedia(
      files ? files : null,
      videos ? JSON.parse(videos) : null
    );

    const questionData = {
      quizId: parseInt(quizId),
      text,
      type: "BUTTONS",
      media: questionMedia,
      options: JSON.parse(options),
    };

    const updatedQuestion = await updateQuestionService(
      Number(id),
      questionData
    );
    return res.status(200).json(updatedQuestion);
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ message: "Server error during button question updating" });
  }
};

// Checkbox question
export const createCheckboxQuestion = async (req, res) => {
  const { quizId, text, options, videos } = req.body;
  const files = req.files;

  try {
    const questionMedia = await uploadMedia(
      files ? files : null,
      videos ? JSON.parse(videos) : null
    );

    const questionData = {
      quizId: Number(quizId),
      text,
      type: "CHECKBOXES",
      media: questionMedia,
      options: JSON.parse(options),
    };

    const newQuestion = await createQuestionService(questionData);
    return res.status(201).json(newQuestion);
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ message: "Server error during checkbox question creation" });
  }
};

export const updateCheckboxQuestion = async (req, res) => {
  const { quizId, text, options, videos } = req.body;
  const { id } = req.params;
  const files = req.files;
  try {
    const questionMedia = await uploadMedia(
      files ? files : null,
      videos ? JSON.parse(videos) : null
    );

    const questionData = {
      quizId: parseInt(quizId),
      text,
      type: "CHECKBOXES",
      media: questionMedia,
      options: JSON.parse(options),
    };

    const updatedQuestion = await updateQuestionService(
      Number(id),
      questionData
    );
    return res.status(200).json(updatedQuestion);
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ message: "Server error during checkbox question updating" });
  }
};

// Range question

export const createRangeQuestion = async (req, res) => {
  const { quizId, text, minValue, maxValue, correctValue, videos } = req.body;
  const files = req.files;

  try {
    const questionMedia = await uploadMedia(
      files ? files : null,
      videos ? JSON.parse(videos) : null
    );

    const questionData = {
      quizId: Number(quizId),
      text,
      type: "RANGE",
      minValue: Number(minValue),
      maxValue: Number(maxValue),
      correctValue: Number(correctValue),
      media: questionMedia,
    };

    const newQuestion = await createQuestionService(questionData);
    return res.status(201).json(newQuestion);
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ message: "Server error during range question creation" });
  }
};

export const updateRangeQuestion = async (req, res) => {
  const { quizId, text, minValue, maxValue, correctValue, videos } = req.body;
  const files = req.files;
  const { id } = req.params;

  try {
    const questionMedia = await uploadMedia(
      files ? files : null,
      videos ? JSON.parse(videos) : null
    );

    const questionData = {
      quizId: parseInt(quizId),
      text,
      type: "RANGE",
      minValue: parseInt(minValue),
      maxValue: parseInt(maxValue),
      correctValue: parseInt(correctValue),
      media: questionMedia,
    };

    const updatedQuestion = await updateQuestionService(
      Number(id),
      questionData
    );
    return res.status(201).json(updatedQuestion);
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ message: "Server error during range question updating" });
  }
};

// Reorder question

export const createReorderQuestion = async (req, res) => {
  const { quizId, text, options, videos } = req.body;
  const files = req.files;

  try {
    const questionMedia = await uploadMedia(
      files ? files : null,
      videos ? JSON.parse(videos) : null
    );

    const questionData = {
      quizId: parseInt(quizId),
      text,
      type: "REORDER",
      media: questionMedia,
      options: JSON.parse(options),
    };

    const newQuestion = await createQuestionService(questionData);
    return res.status(201).json(newQuestion);
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ message: "Server error during reorder question creation" });
  }
};

export const updateReorderQuestion = async (req, res) => {
  const { quizId, text, options, videos } = req.body;
  const files = req.files;
  const { id } = req.params;

  try {
    const questionMedia = await uploadMedia(
      files ? files : null,
      videos ? JSON.parse(videos) : null
    );

    const questionData = {
      quizId: parseInt(quizId),
      text,
      type: "REORDER",
      media: questionMedia,
      options: JSON.parse(options),
    };

    const updatedQuestion = await updateQuestionService(
      Number(id),
      questionData
    );
    return res.status(200).json(updatedQuestion);
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ message: "Server error during reorder question updating" });
  }
};

// Location question
export const createLocationQuestion = async (req, res) => {
  const { quizId, text, correctLatitude, correctLongitude, videos } = req.body;
  const files = req.files;

  try {
    const questionMedia = await uploadMedia(
      files ? files : null,
      videos ? JSON.parse(videos) : null
    );

    const questionData = {
      quizId: parseInt(quizId),
      text,
      type: "LOCATION",
      correctLatitude: parseFloat(correctLatitude),
      correctLongitude: parseFloat(correctLongitude),
      media: questionMedia,
    };

    const newQuestion = await createQuestionService(questionData);
    return res.status(201).json(newQuestion);
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ message: "Server error during location question creation" });
  }
};

export const updateLocationQuestion = async (req, res) => {
  const { quizId, text, correctLatitude, correctLongitude, videos } = req.body;
  const files = req.files;
  const { id } = req.params;

  try {
    const questionMedia = await uploadMedia(
      files ? files : null,
      videos ? JSON.parse(videos) : null
    );

    const questionData = {
      quizId: parseInt(quizId),
      text,
      type: "LOCATION",
      correctLatitude: parseFloat(correctLatitude),
      correctLongitude: parseFloat(correctLongitude),
      media: questionMedia,
    };

    const updatedQuestion = await updateQuestionService(
      Number(id),
      questionData
    );
    return res.status(200).json(updatedQuestion);
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ message: "Server error during location question updating" });
  }
};

// Type answer question

export const createTypeAnswerQuestion = async (req, res) => {
  const { quizId, text, correctAnswer, videos } = req.body;
  const files = req.files;

  try {
    const questionMedia = await uploadMedia(
      files ? files : null,
      videos ? JSON.parse(videos) : null
    );

    const questionData = {
      quizId: parseInt(quizId),
      text,
      type: "TYPEANSWER",
      correctAnswer,
      media: questionMedia,
    };

    const newQuestion = await createQuestionService(questionData, req.userId);
    return res.status(201).json(newQuestion);
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ message: "Server error during type answer question creation" });
  }
};

export const updateTypeAnswerQuestion = async (req, res) => {
  const { quizId, text, correctAnswer, videos } = req.body;
  const files = req.files;
  const { id } = req.params;

  try {
    const questionMedia = await uploadMedia(
      files ? files : null,
      videos ? JSON.parse(videos) : null
    );

    const questionData = {
      quizId: parseInt(quizId),
      text,
      type: "TYPEANSWER",
      correctAnswer,
      media: questionMedia,
    };

    const updatedQuestion = await updateQuestionService(
      Number(id),
      questionData
    );
    return res.status(200).json(updatedQuestion);
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ message: "Server error during type answer question updating" });
  }
};
