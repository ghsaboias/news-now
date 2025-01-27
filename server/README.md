
# Gmail Webhook Server

A production-ready Express server for handling Gmail API push notifications.

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install express morgan dotenv jsonwebtoken @types/express @types/node typescript ts-node
   ```
3. Create a `.env` file using the example template:
   ```bash
   cp .env.example .env
   ```
4. Update the environment variables with your Google API credentials

## Configuration

The server uses the following environment variables:

- `PORT`: The port number to listen on (default: 3000)
- `GOOGLE_PRIVATE_KEY`: Your Google API private key
- `WEBHOOK_SECRET`: Secret key for webhook verification

## Running the Server

```bash
npm run dev
```

## Webhook Setup

1. Configure Gmail API to send push notifications to your server endpoint
2. Use ngrok to expose your local server during development:
   ```bash
   ngrok http 3000
   ```
3. Set your ngrok URL as the webhook endpoint in the Gmail API settings

## Features

- Verification of Google-signed webhooks
- Handling of different notification types
- TypeScript support
- Proper error handling and logging
- Environment variable configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
