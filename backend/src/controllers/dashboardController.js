import { getDashboard } from '../services/dashboardService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDashboardHandler = asyncHandler(async (req, res) => {
  const dashboard = await getDashboard(req.query);

  return res.status(200).json({ dashboard });
});
