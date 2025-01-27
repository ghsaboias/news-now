
import * as express from 'express';
import * as morgan from 'morgan';
import { config } from './config';
import { router as webhookRouter } from './routes/webhook';
import { verifyWebhook } from './middleware/auth';

export const app = express();

// Middleware setup
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/webhook', webhookRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const port = config.port;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
