import api from './api';

const filenameFrom = (headers, fallback) => {
  const disposition = headers?.['content-disposition'] ?? '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match ? match[1] : fallback;
};

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

// Error bodies arrive as Blob because the request asks for a file download.
const parseBlobError = async (error) => {
  const data = error?.response?.data;

  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (parsed?.message) {
        error.response.data = parsed;
      }
    } catch {
      // Keep the original error when the body is not readable JSON.
    }
  }

  return error;
};

export const getBackupDatasetsApi = async () => {
  const response = await api.get('/backup/datasets');
  return response.data.datasets;
};

export const downloadBackupApi = async ({ format = 'json', dataset } = {}) => {
  try {
    const response = await api.get('/backup/export', {
      params: { format, ...(dataset ? { dataset } : {}) },
      responseType: 'blob',
      timeout: 60000,
    });

    const fallback =
      format === 'csv' ? `${dataset ?? 'data-export'}.csv` : 'tirupati-backup.json';

    saveBlob(response.data, filenameFrom(response.headers, fallback));

    return { filename: filenameFrom(response.headers, fallback) };
  } catch (error) {
    throw await parseBlobError(error);
  }
};
