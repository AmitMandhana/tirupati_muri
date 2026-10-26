import api from './api';

export const getPartiesApi = async (params = {}) => {
  const { data } = await api.get('/parties', { params });
  return data;
};

export const createPartyApi = async (payload) => {
  const { data } = await api.post('/parties', payload);
  return data;
};

export const updatePartyApi = async (partyId, payload) => {
  const { data } = await api.put(`/parties/${partyId}`, payload);
  return data;
};

export const getPartyApi = async (partyId) => {
  const { data } = await api.get(`/parties/${partyId}`);
  return data;
};

export const getReceivablesApi = async (params = {}) => {
  const { data } = await api.get('/parties/receivables', { params });
  return data;
};

export const receivePaymentApi = async (partyId, payload) => {
  const { data } = await api.post(`/parties/${partyId}/payments`, payload);
  return data;
};
