import api from './api';

export const getBankAccountsApi = async () => {
  const { data } = await api.get('/bank-accounts');
  return data;
};

export const getBankAccountApi = async (accountId) => {
  const { data } = await api.get(`/bank-accounts/${accountId}`);
  return data;
};

export const createBankAccountApi = async (payload) => {
  const { data } = await api.post('/bank-accounts', payload);
  return data;
};

export const updateBankAccountApi = async (accountId, payload) => {
  const { data } = await api.put(`/bank-accounts/${accountId}`, payload);
  return data;
};

export const addBankTransactionApi = async (accountId, payload) => {
  const { data } = await api.post(`/bank-accounts/${accountId}/transactions`, payload);
  return data;
};

export const transferFundsApi = async (payload) => {
  const { data } = await api.post('/bank-accounts/transfer', payload);
  return data;
};
