import { formatReceiptDate } from './format';

const formatDateKey = (dateKey) => formatReceiptDate(new Date(`${dateKey}T12:00:00`));

export const describeProductionFilters = ({ search = '', from = '', to = '' } = {}) => {
  const parts = [];

  if (search.trim()) {
    parts.push(`Search: "${search.trim()}"`);
  }

  if (from) {
    parts.push(`From ${formatDateKey(from)}`);
  }

  if (to) {
    parts.push(`To ${formatDateKey(to)}`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'All production records';
};
