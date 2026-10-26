import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import NavIcon from './NavIcon';
import Spinner from './Spinner';
import { downloadBackupApi, getBackupDatasetsApi } from '../services/backupService';
import { getApiErrorMessage } from '../utils/errors';

const DataExportCard = () => {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyFormat, setBusyFormat] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    getBackupDatasetsApi()
      .then((list) => {
        if (!isMounted) {
          return;
        }

        setDatasets(list);
        setSelectedDataset((current) =>
          current && list.some((item) => item.key === current) ? current : (list[0]?.key ?? ''),
        );
        setLoadError('');
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(getApiErrorMessage(error, 'Unable to load the list of exportable datasets.'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  const handleRetry = () => {
    setLoadError('');
    setIsLoading(true);
    setReloadToken((token) => token + 1);
  };

  const handleDownload = async (format) => {
    if (format === 'csv' && !selectedDataset) {
      toast.error('Choose a dataset to export.');
      return;
    }

    setBusyFormat(format);

    try {
      await downloadBackupApi({
        format,
        dataset: format === 'csv' ? selectedDataset : undefined,
      });

      if (format === 'csv') {
        const label = datasets.find((item) => item.key === selectedDataset)?.label ?? 'Dataset';
        toast.success(`${label} exported as CSV.`);
      } else {
        toast.success('Full backup downloaded.');
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to export data. Please try again.'));
    } finally {
      setBusyFormat('');
    }
  };

  const selectedLabel = datasets.find((item) => item.key === selectedDataset)?.label ?? '';

  return (
    <section className="card">
      <div className="flex items-center gap-3 border-b border-cream-200 px-6 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <NavIcon name="download" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-ink-900">Export data</h2>
          <p className="text-xs text-ink-500">
            Download a copy of your books for safekeeping or accounting.
          </p>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Full backup (JSON)</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              Every business dataset with settings, transaction dates and reference numbers. Password
              hashes and environment secrets are never included.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary shrink-0"
            onClick={() => handleDownload('json')}
            disabled={Boolean(busyFormat)}
          >
            {busyFormat === 'json' ? (
              <>
                <Spinner /> Preparing...
              </>
            ) : (
              'Download JSON'
            )}
          </button>
        </div>

        <div className="border-t border-cream-200 pt-5">
          <h3 className="text-sm font-semibold text-ink-900">Single dataset (CSV)</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            CSV files open directly in Excel or Google Sheets. Export sales, parties, invoices, bank
            transactions and more.
          </p>

          {isLoading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-ink-500">
              <Spinner className="h-4 w-4 text-brand-600" />
              Loading datasets...
            </div>
          ) : loadError ? (
            <div className="mt-3 text-sm text-red-600">
              {loadError}{' '}
              <button type="button" className="font-semibold underline" onClick={handleRetry}>
                Try again
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <select
                id="backup-dataset"
                aria-label="Dataset to export"
                className="field-input sm:max-w-xs"
                value={selectedDataset}
                onChange={(event) => setSelectedDataset(event.target.value)}
                disabled={Boolean(busyFormat)}
              >
                {datasets.map((dataset) => (
                  <option key={dataset.key} value={dataset.key}>
                    {dataset.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleDownload('csv')}
                disabled={Boolean(busyFormat) || datasets.length === 0}
              >
                {busyFormat === 'csv' ? (
                  <>
                    <Spinner /> Preparing...
                  </>
                ) : (
                  `Download ${selectedLabel || 'CSV'}`
                )}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-cream-200 bg-cream-50/70 p-4">
          <h3 className="text-sm font-semibold text-ink-900">MongoDB Atlas backup</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            JSON exports are a readable copy, not a database restore. Keep an Atlas snapshot as the
            disaster-recovery backup.
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-ink-500">
            <li>
              In MongoDB Atlas open your cluster, then <strong>Backup → Cloud Backup</strong> and
              enable daily snapshots (continuous backup for busy periods).
            </li>
            <li>
              Keep at least 7 daily snapshots and download one archive copy every month to offline
              or encrypted storage.
            </li>
            <li>
              Restore with the Atlas <strong>Restore</strong> action, or download an archive and run{' '}
              <code className="rounded bg-white px-1 py-0.5 text-[11px] text-ink-700">
                mongorestore --uri &quot;&lt;connection string&gt;&quot; --gzip --archive=backup.gz
              </code>
              .
            </li>
            <li>
              Store the JSON exports from this page in a different location from the database, for
              example an encrypted drive or your accountant&apos;s records.
            </li>
            <li>
              Test a restore into a temporary database at least once a quarter so a real emergency
              is not the first time you try it.
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
};

export default DataExportCard;
