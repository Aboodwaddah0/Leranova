import * as notifService from '../services/notificationService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';

const getUserNotifications = catchAsync(async (req, res) => {
  const data = await notifService.getUserNotifications(req.user.id);
  sendSuccess(res, data);
});

const markAsSeen = catchAsync(async (req, res) => {
  const data = await notifService.markAsSeen(req.params.id, req.user.id);
  sendSuccess(res, data);
});

export { getUserNotifications, markAsSeen };
