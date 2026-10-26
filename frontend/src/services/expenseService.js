import api from './api';

export const getExpensesApi = async (params = {}) => {
  const { data } = await api.get('/expenses', { params });
  return data;
};

export const createExpenseApi = async (payload) => {
  const { data } = await api.post('/expenses', payload);
  return data;
};

export const getExpenseCategoriesApi = async () => {
  const { data } = await api.get('/expenses/categories');
  return data;
};

export const createExpenseCategoryApi = async (payload) => {
  const { data } = await api.post('/expenses/categories', payload);
  return data;
};
