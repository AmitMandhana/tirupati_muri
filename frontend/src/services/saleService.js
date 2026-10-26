import api from './api';

export const createSaleApi = async (payload) => {
  const response = await api.post('/sales', payload);
  return response.data;
};

export const getSalesApi = async (params) => {
  const response = await api.get('/sales', { params });
  return response.data;
};

export const getSalesSummaryApi = async () => {
  const response = await api.get('/sales/summary');
  return response.data;
};
