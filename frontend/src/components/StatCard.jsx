import NavIcon from './NavIcon';
import { formatINR } from '../utils/format';

const StatCard = ({ title, value = 0, icon = 'dashboard', hint = 'No entries yet' }) => (
  <article className="card p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-medium text-ink-500">{title}</p>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <NavIcon name={icon} className="h-[18px] w-[18px]" />
      </span>
    </div>
    <p className="mt-3 text-2xl font-semibold tracking-tight text-ink-900">{formatINR(value)}</p>
    <p className="mt-1 text-xs text-ink-400">{hint}</p>
  </article>
);

export default StatCard;
