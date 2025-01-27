
import express, { Router, Request, Response } from 'express';
import { WebhookRequest } from './types';
import { ErrorResponse } from './types';

const router: Router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, url, events }: WebhookRequest = req.body;

    if (!name || !url || !events) {
      return res.status(400).json({
        status: 400,
        message: 'Bad Request',
        details: 'Missing required fields'
      });
    }

    // Implement your webhook creation logic here
    // For example, save to database
    // const webhook = await createWebhook({ name, url, events });

    res.status(201).json({
      status: 201,
      message: 'Webhook created successfully',
      data: { name, url, events }
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({
      status: 500,
      message: 'Internal Server Error',
      details: 'Failed to create webhook'
    });
  }
});

export default router;
