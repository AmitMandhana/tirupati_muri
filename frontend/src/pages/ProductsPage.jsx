import { useEffect, useState } from 'react';

import ConfirmDialog from '../components/ConfirmDialog';
import NavIcon from '../components/NavIcon';
import PageHeader from '../components/PageHeader';
import ProductFormDialog from '../components/ProductFormDialog';
import Spinner from '../components/Spinner';
import { getProductsApi, updateProductApi } from '../services/productService';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../utils/errors';
import { formatRate } from '../utils/format';

const sortProducts = (items) =>
  [...items].sort((a, b) => {
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [togglingId, setTogglingId] = useState('');
  const [pendingDeactivate, setPendingDeactivate] = useState(null);

  useEffect(() => {
    let isMounted = true;

    getProductsApi()
      .then((data) => {
        if (isMounted) {
          setProducts(data.products);
          setLoadError('');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(getApiErrorMessage(error, 'Unable to load products.'));
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

  const openAddDialog = () => {
    setEditingProduct(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  const handleSaved = (savedProduct) => {
    setProducts((prev) => {
      const exists = prev.some((product) => product._id === savedProduct._id);
      const next = exists
        ? prev.map((product) => (product._id === savedProduct._id ? savedProduct : product))
        : [...prev, savedProduct];

      return sortProducts(next);
    });
    closeDialog();
  };

  const applyActiveChange = async (product, active) => {
    setTogglingId(product._id);

    try {
      const data = await updateProductApi(product._id, { active });
      setProducts((prev) =>
        sortProducts(
          prev.map((item) => (item._id === data.product._id ? data.product : item)),
        ),
      );
      toast.success(active ? 'Product activated.' : 'Product deactivated.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update the product status.'));
    } finally {
      setTogglingId('');
    }
  };

  const handleToggleClick = (product) => {
    if (product.active) {
      setPendingDeactivate(product);
      return;
    }

    applyActiveChange(product, true);
  };

  const handleConfirmDeactivate = () => {
    const product = pendingDeactivate;
    setPendingDeactivate(null);

    if (product) {
      applyActiveChange(product, false);
    }
  };

  const query = searchTerm.trim().toLowerCase();
  const visibleProducts = query
    ? products.filter((product) => product.name.toLowerCase().includes(query))
    : products;
  const activeCount = products.filter((product) => product.active).length;

  return (
    <div>
      <PageHeader
        title="Product Management"
        description="Maintain the products you sell, along with retail rates, wholesale rates and bag weight. Products are deactivated instead of deleted."
        actions={
          <button type="button" className="btn-primary" onClick={openAddDialog}>
            Add product
          </button>
        }
      />

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-cream-200 bg-cream-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <label htmlFor="product-search" className="sr-only">
              Search products
            </label>
            <input
              id="product-search"
              type="search"
              className="field-input"
              placeholder="Search products by name"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <p className="text-xs text-ink-500">
            {products.length} {products.length === 1 ? 'product' : 'products'} · {activeCount}{' '}
            active
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-ink-500">
            <Spinner className="h-4 w-4 text-brand-600" />
            Loading products...
          </div>
        ) : loadError ? (
          <div className="px-6 py-10">
            <h2 className="text-base font-semibold text-ink-900">Products could not be loaded</h2>
            <p className="mt-1 text-sm text-ink-500">{loadError}</p>
            <button type="button" className="btn-secondary mt-4" onClick={handleRetry}>
              Try again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <NavIcon name="products" className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-ink-900">No products yet</h2>
            <p className="mt-1 max-w-sm text-sm text-ink-500">
              Add your first product with its retail and wholesale rates to start building your
              catalogue.
            </p>
            <button type="button" className="btn-primary mt-5" onClick={openAddDialog}>
              Add product
            </button>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <h2 className="text-base font-semibold text-ink-900">No matching products</h2>
            <p className="mt-1 text-sm text-ink-500">
              No product name matches “{searchTerm.trim()}”.
            </p>
            <button
              type="button"
              className="btn-secondary mt-4"
              onClick={() => setSearchTerm('')}
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-ink-400">
                <tr className="border-b border-cream-200">
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Product
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Unit
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Retail rate
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Wholesale rate
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Bag weight
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
                {visibleProducts.map((product) => {
                  const isToggling = togglingId === product._id;

                  return (
                    <tr key={product._id} className="align-middle">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-ink-900">{product.name}</p>
                      </td>
                      <td className="px-5 py-3.5 text-ink-500">{product.unit}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-ink-900">
                        {formatRate(product.retailRate)}
                        <span className="ml-1 text-xs font-normal text-ink-400">
                          / {product.unit}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-ink-900">
                        {formatRate(product.wholesaleRate)}
                        <span className="ml-1 text-xs font-normal text-ink-400">
                          / {product.unit}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-ink-700">
                        {product.bagWeight} KG
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`pill ${
                            product.active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-cream-100 text-ink-500'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              product.active ? 'bg-emerald-500' : 'bg-ink-400'
                            }`}
                            aria-hidden="true"
                          />
                          {product.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-cream-300 px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                            onClick={() => openEditDialog(product)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isToggling}
                            className="rounded-md border border-cream-300 px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => handleToggleClick(product)}
                          >
                            {isToggling ? 'Saving...' : product.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-3 text-xs text-ink-400">
        Inactive products stay in the catalogue but will not appear in future sales screens.
      </p>

      {isDialogOpen ? (
        <ProductFormDialog
          product={editingProduct}
          onClose={closeDialog}
          onSaved={handleSaved}
        />
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(pendingDeactivate)}
        title="Deactivate product?"
        message={
          pendingDeactivate
            ? `${pendingDeactivate.name} will no longer be available for future sales. Existing records are not affected, and you can reactivate it at any time.`
            : ''
        }
        confirmText="Deactivate"
        cancelText="Keep active"
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setPendingDeactivate(null)}
      />
    </div>
  );
};

export default ProductsPage;
