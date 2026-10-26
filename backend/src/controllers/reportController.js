import { getReport } from '../services/reportService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getReportHandler = asyncHandler(async (req, res) => {
  const report = await getReport(req.params.report, req.query);

  return res.status(200).json({ report });
});
