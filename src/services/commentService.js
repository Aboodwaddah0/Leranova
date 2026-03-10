import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const getCommentsByLesson = async (lessonId) => {
  return prisma.comment.findMany({
    where: { lesson_id: Number(lessonId) },
    include: { user: { select: { id: true, Name: true } } },
  });
};

const createComment = async (userId, data) => {
  return prisma.comment.create({ data: { ...data, User_id: Number(userId) } });
};

const deleteComment = async (id, userId) => {
  const comment = await prisma.comment.findUnique({ where: { id: Number(id) } });
  if (!comment) throw new AppError('Comment not found', 404);
  if (comment.User_id !== Number(userId)) throw new AppError('Not authorized', 403);
  await prisma.comment.delete({ where: { id: Number(id) } });
};

export { getCommentsByLesson, createComment, deleteComment };
