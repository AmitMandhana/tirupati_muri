import { buildBackup, buildCsv, listBackupDatasets } from '../services/backupService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';

const sendDownload = (res, filename, contentType, content) => {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(content);
};

export const listDatasets = (req, res) => res.status(200).json({ datasets: listBackupDatasets() });

export const exportData = asyncHandler(async (req, res) => {
  const format = String(req.query.format ?? 'json').toLowerCase();

  if (format === 'json') {
    const backup = await buildBackup();

    return sendDownload(
      res,
      `tirupati-backup-${backup.meta.exportedOn}.json`,
      'application/json; charset=utf-8',
      JSON.stringify(backup, null, 2),
    );
  }

  if (format === 'csv') {
    const { filename, content, rowCount } = await buildCsv(req.query.dataset);

    if (rowCount === 0) {
      throw httpError(404, 'There is no data in that dataset to export yet.');
    }

    // BOM keeps Excel from mangling the Rupee symbol and other Unicode text.
    return sendDownload(res, filename, 'text/csv; charset=utf-8', `\uFEFF${content}`);
  }

  throw httpError(400, 'Choose either json or csv as the export format.');
});
