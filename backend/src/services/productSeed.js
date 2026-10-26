import { Product } from '../models/Product.js';

const INITIAL_PRODUCT = {
  name: 'Muri',
  unit: 'KG',
  retailRate: 45,
  wholesaleRate: 42,
  bagWeight: 50,
  active: true,
};

export const seedInitialProduct = async () => {
  const result = await Product.updateOne(
    {},
    { $setOnInsert: INITIAL_PRODUCT },
    { upsert: true },
  );

  if (result.upsertedCount > 0) {
    console.log('Seeded initial product: Muri (KG)');
  }
};
