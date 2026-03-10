import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const getAssetsByLesson = async (lessonId) => {
  return prisma.lesson_assets.findMany({ where: { Lesson_id: Number(lessonId) } });
};

const getAssetById = async (id) => {
  const asset = await prisma.lesson_assets.findUnique({
    where: { id: Number(id) },
    include: { lesson: { select: { id: true, name: true } } },
  });
  if (!asset) throw new AppError('Asset not found', 404);
  return asset;
};

const createAsset = async (data) => {
  return prisma.lesson_assets.create({ data });
};

const updateAsset = async (id, data) => {
  const asset = await prisma.lesson_assets.findUnique({ where: { id: Number(id) } });
  if (!asset) throw new AppError('Asset not found', 404);
  return prisma.lesson_assets.update({ where: { id: Number(id) }, data });
};

const deleteAsset = async (id) => {
  const asset = await prisma.lesson_assets.findUnique({ where: { id: Number(id) } });
  if (!asset) throw new AppError('Asset not found', 404);
  await prisma.lesson_assets.delete({ where: { id: Number(id) } });
};

export { getAssetsByLesson, getAssetById, createAsset, updateAsset, deleteAsset };
