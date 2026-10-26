import api from './api';

export const getProductsApi = async (params) => {
  const response = await api.get('/products', { params });
  return response.data;
};

export const createProductApi = async (payload) => {
  const response = await api.post('/products', payload);
  return response.data;
};

export const updateProductApi = async (id, payload) => {
  const response = await api.put(`/products/${id}`, payload);
  return response.data;
};
