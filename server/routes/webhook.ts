
import * as express from 'express';
import { verifyWebhook } from '../middleware/auth';
import { GmailNotificationPayload } from '../types';

export const router = express.Router();

router.post('/', verifyWebhook, (req, res) => {
  try {
    const payload = req.body as GmailNotificationPayload;

    switch (payload.type) {
      case 'MESSAGE_CHANGED':
        handleMessageChanged(payload);
        break;
      case 'LABEL_ADDED':
        handleLabelAdded(payload);
        break;
      case 'LABEL_REMOVED':
        handleLabelRemoved(payload);
        break;
      default:
        console.log('Unhandled webhook type:', payload.type);
        break;
    }

    res.status(200).json({ status: 'Webhook received successfully' });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function handleMessageChanged(payload: GmailMessageChanged) {
  console.log('Message changed:', payload.payload.message);
  // Implement your business logic here
}

function handleLabelAdded(payload: GmailLabelAdded) {
  console.log('Label added:', payload.payload.label);
  // Implement your business logic here
}

function handleLabelRemoved(payload: GmailLabelRemoved) {
  console.log('Label removed:', payload.payload.label);
  // Implement your business logic here
}
