import api from './api';

export const getReportApi = async (report, params = {}) => {
  const response = await api.get(`/reports/${report}`, { params });
  return response.data.report;
};
