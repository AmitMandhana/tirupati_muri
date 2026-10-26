import api from './api';

export const getStaffApi = async (params = {}) => {
  const { data } = await api.get('/staff', { params });
  return data;
};

export const createStaffApi = async (payload) => {
  const { data } = await api.post('/staff', payload);
  return data;
};

export const updateStaffApi = async (staffId, payload) => {
  const { data } = await api.put(`/staff/${staffId}`, payload);
  return data;
};

export const getStaffMemberApi = async (staffId) => {
  const { data } = await api.get(`/staff/${staffId}`);
  return data;
};

export const getStaffSummaryApi = async () => {
  const { data } = await api.get('/staff/summary');
  return data;
};

export const addStaffTransactionApi = async (staffId, payload) => {
  const { data } = await api.post(`/staff/${staffId}/transactions`, payload);
  return data;
};
