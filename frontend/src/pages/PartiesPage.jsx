import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import FormField from '../components/FormField';
import NavIcon from '../components/NavIcon';
import PageHeader from '../components/PageHeader';
import PartyFormDialog from '../components/PartyFormDialog';
import Spinner from '../components/Spinner';
import { getPartiesApi } from '../services/partyService';
import { getApiErrorMessage } from '../utils/errors';
import { formatINR2 } from '../utils/format';

const PartiesPage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [parties, setParties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [formParty, setFormParty] = useState(undefined);

  useEffect(() => {
    let isMounted = true;

    const timer = window.setTimeout(() => {
      const params = { search: search.trim() || undefined };

      if (statusFilter !== 'all') {
        params.active = statusFilter === 'active';
      }

      getPartiesApi(params)
        .then((data) => {
          if (!isMounted) {
            return;
          }

          setParties(Array.isArray(data.parties) ? data.parties : []);
          setLoadError('');
        })
        .catch((error) => {
          if (isMounted) {
            setLoadError(getApiErrorMessage(error, 'Unable to load parties.'));
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [search, statusFilter, refreshToken]);

  const hasFilters = Boolean(search.trim() || statusFilter !== 'all');

  const refresh = () => {
    setIsLoading(true);
    setLoadError('');
    setRefreshToken((token) => token + 1);
  };

  const handleSearchChange = (event) => {
    setIsLoading(true);
    setLoadError('');
    setSearch(event.target.value);
  };

  const handleStatusChange = (event) => {
    setIsLoading(true);
    setLoadError('');
    setStatusFilter(event.target.value);
  };

  const clearFilters = () => {
    if (!hasFilters) {
      return;
    }

    setIsLoading(true);
    setLoadError('');
    setSearch('');
    setStatusFilter('all');
  };

  const handleSaved = () => {
    setFormParty(undefined);
    refresh();
  };

  return (
    <div>
      <PageHeader
        title="Parties"
        description="Manage customer and supplier accounts, opening balances, credit limits and ledger access. Every balance is calculated from invoices and recorded payments."
        actions={
          <button type="button" className="btn-primary" onClick={() => setFormParty(null)}>
            Add party
          </button>
        }
      />

      <section className="card overflow-hidden">
        <div className="border-b border-cream-200 bg-cream-50/60 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(160px,0.6fr)_auto] sm:items-end">
            <FormField label="Search" htmlFor="party-search">
              <input
                id="party-search"
                type="search"
                className="field-input"
                placeholder="Party name or phone"
                value={search}
                onChange={handleSearchChange}
              />
            </FormField>
            <FormField label="Status" htmlFor="party-status">
              <select
                id="party-status"
                className="field-input"
                value={statusFilter}
                onChange={handleStatusChange}
              >
                <option value="all">All parties</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </FormField>
            <button
              type="button"
              className="btn-secondary h-[42px]"
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              Clear filters
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 px-5 py-14 text-sm text-ink-500">
            <Spinner className="h-4 w-4 text-brand-600" />
            Loading parties...
          </div>
        ) : loadError ? (
          <div className="px-5 py-10">
            <h2 className="text-base font-semibold text-ink-900">Parties could not be loaded</h2>
            <p className="mt-1 text-sm text-ink-500">{loadError}</p>
            <button type="button" className="btn-secondary mt-4" onClick={refresh}>
              Try again
            </button>
          </div>
        ) : parties.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <NavIcon name="parties" className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-ink-900">
              {hasFilters ? 'No matching parties' : 'No parties yet'}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-ink-500">
              {hasFilters
                ? 'Try a different search term or status filter.'
                : 'Add your first party to raise wholesale invoices and track payments.'}
            </p>
            {hasFilters ? (
              <button type="button" className="btn-secondary mt-4" onClick={clearFilters}>
                Clear filters
              </button>
            ) : (
              <button type="button" className="btn-primary mt-4" onClick={() => setFormParty(null)}>
                Add party
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.12em] text-ink-400">
                  <tr className="border-b border-cream-200">
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Party
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Phone
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Opening balance
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Credit limit
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Status
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {parties.map((party) => (
                    <tr key={party._id} className="align-top">
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/parties/${party._id}`}
                          className="font-semibold text-ink-900 hover:text-brand-700"
                        >
                          {party.name}
                        </Link>
                        {party.address ? (
                          <p className="mt-0.5 max-w-[240px] truncate text-xs text-ink-400">
                            {party.address}
                          </p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-ink-700">{party.phone}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right text-ink-700">
                        {formatINR2(party.openingBalance)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right text-ink-700">
                        {Number(party.creditLimit) > 0 ? formatINR2(party.creditLimit) : 'No limit'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`pill ${
                            party.active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-cream-100 text-ink-500'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              party.active ? 'bg-emerald-500' : 'bg-ink-400'
                            }`}
                            aria-hidden="true"
                          />
                          {party.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/parties/${party._id}`}
                            className="rounded-md border border-cream-300 px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                          >
                            Ledger
                          </Link>
                          <button
                            type="button"
                            className="rounded-md border border-cream-300 px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                            onClick={() => setFormParty(party)}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-cream-200 px-5 py-3 text-[11px] text-ink-400">
              Showing up to 200 parties. Open a party to see its full ledger, outstanding balance and
              payment reminder.
            </p>
          </>
        )}
      </section>

      {formParty !== undefined ? (
        <PartyFormDialog
          party={formParty}
          onClose={() => setFormParty(undefined)}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  );
};

export default PartiesPage;
