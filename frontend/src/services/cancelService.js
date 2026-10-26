import api from './api';

const cancel = async (url, reason) => {
  const response = await api.post(url, { reason });
  return response.data;
};

export const cancelSaleApi = (saleId, reason) => cancel(`/sales/${saleId}/cancel`, reason);

export const cancelInvoiceApi = (invoiceId, reason) =>
  cancel(`/invoices/${invoiceId}/cancel`, reason);

export const cancelPartyPaymentApi = (partyId, paymentId, reason) =>
  cancel(`/parties/${partyId}/payments/${paymentId}/cancel`, reason);

export const cancelExpenseApi = (expenseId, reason) =>
  cancel(`/expenses/${expenseId}/cancel`, reason);

export const cancelStaffTransactionApi = (staffId, transactionId, reason) =>
  cancel(`/staff/${staffId}/transactions/${transactionId}/cancel`, reason);

export const cancelProductionApi = (productionId, reason) =>
  cancel(`/production/${productionId}/cancel`, reason);

export const cancelBankTransactionApi = (accountId, transactionId, reason) =>
  cancel(`/bank-accounts/${accountId}/transactions/${transactionId}/cancel`, reason);

export const getCancelledTransactionsApi = async (params = {}) => {
  const response = await api.get('/audit/cancelled', { params });
  return response.data.audit;
};
