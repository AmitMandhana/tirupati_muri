import api from './api';

export const getDashboardApi = async (params = {}) => {
  const response = await api.get('/dashboard', { params });
  return response.data.dashboard;
};
