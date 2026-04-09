import Joi from 'joi';

export const updateSchoolSettingsSchema = Joi.object({
  schoolYearStartMonth: Joi.number().integer().min(1).max(12),
  schoolYearStartDay: Joi.number().integer().min(1).max(31),
  promotionMonth: Joi.number().integer().min(1).max(12),
  promotionDay: Joi.number().integer().min(1).max(31),
  entryGradeMinAge: Joi.number().integer().min(4).max(10),
  passThresholdPercentage: Joi.number().min(0).max(100),
  minSubjectPassPercentage: Joi.number().min(0).max(100),
  requireAllSubjectsPass: Joi.boolean(),
}).min(1);

export const runPromotionSchema = Joi.object({
  schoolYear: Joi.number().integer().min(2000).max(2200),
  force: Joi.boolean().default(false),
});
