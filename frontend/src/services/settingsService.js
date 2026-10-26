import api from './api';

export const getSettingsApi = async () => {
  const response = await api.get('/settings');
  return response.data;
};

export const updateSettingsApi = async (payload) => {
  const response = await api.put('/settings', payload);
  return response.data;
};
