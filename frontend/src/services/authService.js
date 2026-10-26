import api from './api';

export const loginApi = async (payload) => {
  const response = await api.post('/auth/login', payload);
  return response.data;
};

export const setupApi = async (payload) => {
  const response = await api.post('/auth/setup', payload);
  return response.data;
};

export const meApi = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};
