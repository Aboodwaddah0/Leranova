import * as parentService from '../services/parentService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';

const getParentById = catchAsync(async (req, res) => {
  const data = await parentService.getParentById(req.params.id);
  sendSuccess(res, data);
});

export { getParentById };
