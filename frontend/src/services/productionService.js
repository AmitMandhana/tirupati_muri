import api from './api';

export const getProductionsApi = async (params = {}) => {
  const { data } = await api.get('/production', { params });
  return data;
};

export const createProductionApi = async (payload) => {
  const { data } = await api.post('/production', payload);
  return data;
};

export const getProductionSummaryApi = async () => {
  const { data } = await api.get('/production/summary');
  return data;
};
