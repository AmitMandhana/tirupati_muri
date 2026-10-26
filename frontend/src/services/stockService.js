import api from './api';

export const getStockOverviewApi = async () => {
  const response = await api.get('/stock');
  return response.data;
};

export const getStockLedgerApi = async (productId, params) => {
  const response = await api.get(`/stock/${productId}/ledger`, { params });
  return response.data;
};

export const recordOpeningStockApi = async (payload) => {
  const response = await api.post('/stock/opening', payload);
  return response.data;
};

export const createStockMovementApi = async (payload) => {
  const response = await api.post('/stock/movements', payload);
  return response.data;
};
