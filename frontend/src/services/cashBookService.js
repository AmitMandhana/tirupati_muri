import api from './api';

export const getCashBookApi = async (date) => {
  const { data } = await api.get('/cash-book', {
    params: date ? { date } : undefined,
  });
  return data;
};

export const getCashBookSummaryApi = async () => {
  const { data } = await api.get('/cash-book/summary');
  return data;
};

export const updateOpeningCashApi = async (payload) => {
  const { data } = await api.put('/cash-book/opening', payload);
  return data;
};

export const recordCashCountApi = async (payload) => {
  const { data } = await api.post('/cash-book/counts', payload);
  return data;
};
