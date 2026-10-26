import api from './api';

export const getInvoicesApi = async (params = {}) => {
  const { data } = await api.get('/invoices', { params });
  return data;
};

export const createInvoiceApi = async (payload) => {
  const { data } = await api.post('/invoices', payload);
  return data;
};

export const getInvoiceApi = async (invoiceId) => {
  const { data } = await api.get(`/invoices/${invoiceId}`);
  return data;
};
