
import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from './config';

export const verifyWebhook = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const signature = req.headers['x-goog-signature'] as string;
    const payload = req.body;

    if (!signature || !payload) {
      return res.status(401).json({ error: 'Invalid request signature' });
    }

    // Verify JWT signature
    const decoded = jwt.verify(signature, config.google.privateKey, {
      algorithms: ['ES256'],
    });

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid signature verification' });
    }

    next();
  } catch (error) {
    console.error('Webhook verification failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
