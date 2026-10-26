import { ExpenseCategory } from '../models/ExpenseCategory.js';

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Electricity',
  'Fuel',
  'Transport',
  'Salary',
  'Maintenance',
  'Rent',
  'Packaging',
  'Repairs',
  'Bank Charges',
  'Loan Interest',
  'Miscellaneous',
];

export const seedExpenseCategories = async () => {
  const operations = DEFAULT_EXPENSE_CATEGORIES.map((name, index) => ({
    updateOne: {
      filter: { nameKey: name.toLowerCase() },
      update: {
        $setOnInsert: {
          name,
          nameKey: name.toLowerCase(),
          sortOrder: index + 1,
        },
      },
      upsert: true,
    },
  }));

  const result = await ExpenseCategory.bulkWrite(operations, { ordered: false });

  if (result.upsertedCount > 0) {
    console.log(`Seeded ${result.upsertedCount} expense categories.`);
  }
};
