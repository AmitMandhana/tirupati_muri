import api from './api';

export const getPartiesApi = async (params = {}) => {
  const { data } = await api.get('/parties', { params });
  return data;
};

export const createPartyApi = async (payload) => {
  const { data } = await api.post('/parties', payload);
  return data;
};
