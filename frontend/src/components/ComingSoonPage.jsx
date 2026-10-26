import { Link } from 'react-router-dom';

import NavIcon from './NavIcon';
import PageHeader from './PageHeader';

const ComingSoonPage = ({ title, icon, description }) => (
  <div>
    <PageHeader title={title} description={description} />

    <section className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <NavIcon name={icon} className="h-7 w-7" />
      </span>
      <span className="pill mt-5 border border-brand-200 bg-brand-50 uppercase tracking-[0.14em] text-brand-700">
        Coming soon
      </span>
      <h2 className="mt-4 text-lg font-semibold text-ink-900">
        {title} will be available in a later phase
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-500">
        This section is part of the planned build. It has been left empty on purpose for now,
        and no sample records are shown.
      </p>
      <Link to="/" className="btn-secondary mt-6">
        Back to dashboard
      </Link>
    </section>
  </div>
);

export default ComingSoonPage;
