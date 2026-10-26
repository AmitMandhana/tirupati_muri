import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import morgan from 'morgan';

import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import bankAccountRoutes from './routes/bankAccountRoutes.js';
import cashBookRoutes from './routes/cashBookRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import partyRoutes from './routes/partyRoutes.js';
import productRoutes from './routes/productRoutes.js';
import productionRoutes from './routes/productionRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import wholesaleInvoiceRoutes from './routes/wholesaleInvoiceRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

export const app = express();

app.disable('x-powered-by');

app.use(
  cors({
    origin: env.clientUrl,
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(morgan(env.isProduction ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/invoices', wholesaleInvoiceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/cash-book', cashBookRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);

app.use(notFound);
app.use(errorHandler);
