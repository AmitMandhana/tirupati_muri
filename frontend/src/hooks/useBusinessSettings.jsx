import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { getSettingsApi, updateSettingsApi } from '../services/settingsService';
import { getApiErrorMessage } from '../utils/errors';

export const DEFAULT_BUSINESS_SETTINGS = {
  businessName: 'Tirupati Puffed Rice Mill',
  address: '',
  phone: '',
  email: '',
  gstNumber: '',
  ownerName: '',
  receiptFooter: '',
  invoiceFooter: '',
  retailMuriRate: 45,
  wholesaleMuriRate: 42,
  bagWeightKg: 50,
};

const BusinessSettingsContext = createContext(null);

export const BusinessSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_BUSINESS_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const applySettings = useCallback((data) => {
    setSettings({ ...DEFAULT_BUSINESS_SETTINGS, ...data.settings });
    setLoadError('');
  }, []);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const data = await getSettingsApi();
      applySettings(data);
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Unable to load business settings.'));
    } finally {
      setIsLoading(false);
    }
  }, [applySettings]);

  useEffect(() => {
    let isMounted = true;

    getSettingsApi()
      .then((data) => {
        if (isMounted) {
          applySettings(data);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(getApiErrorMessage(error, 'Unable to load business settings.'));
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
  }, [applySettings]);

  const saveSettings = useCallback(async (values) => {
    const data = await updateSettingsApi(values);
    setSettings({ ...DEFAULT_BUSINESS_SETTINGS, ...data.settings });
    return data;
  }, []);

  return (
    <BusinessSettingsContext.Provider
      value={{ settings, isLoading, loadError, loadSettings, saveSettings }}
    >
      {children}
    </BusinessSettingsContext.Provider>
  );
};

export const useBusinessSettings = () => {
  const context = useContext(BusinessSettingsContext);

  if (!context) {
    throw new Error('useBusinessSettings must be used inside BusinessSettingsProvider.');
  }

  return context;
};
