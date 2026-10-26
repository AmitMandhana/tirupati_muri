import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';

import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import bankAccountRoutes from './routes/bankAccountRoutes.js';
import cashBookRoutes from './routes/cashBookRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import partyRoutes from './routes/partyRoutes.js';
import productRoutes from './routes/productRoutes.js';
import productionRoutes from './routes/productionRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import wholesaleInvoiceRoutes from './routes/wholesaleInvoiceRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

export const app = express();

app.disable('x-powered-by');

if (env.trustProxy) {
  app.set('trust proxy', 1);
}

app.use(helmet());

app.use(
  cors({
    origin: env.clientOrigins,
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(morgan(env.isProduction ? 'combined' : 'dev'));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please wait a moment and try again.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please try again in 15 minutes.' },
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/setup', authLimiter);

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
app.use('/api/staff', staffRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/audit', auditRoutes);

app.use(notFound);
app.use(errorHandler);
