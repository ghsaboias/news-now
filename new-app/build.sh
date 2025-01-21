#!/bin/bash
set -e

# Load environment variables
set -a 
source .env.local 
set +a

# Copy env file
cp .env.local .env.production

# Detect OS and use appropriate sed syntax
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i "" "s#DATA_DIR=./data#DATA_DIR=/var/www/app.aiworld.com.br/data#" .env.production
    sed -i "" "s#LOG_DIR=./logs#LOG_DIR=/var/www/app.aiworld.com.br/logs#" .env.production
else
    # Linux
    sed -i "s#DATA_DIR=./data#DATA_DIR=/var/www/app.aiworld.com.br/data#" .env.production
    sed -i "s#LOG_DIR=./logs#LOG_DIR=/var/www/app.aiworld.com.br/logs#" .env.production
fi

# Clean and build
rm -rf .next node_modules/.cache
npm ci
NODE_OPTIONS="--max-old-space-size=512" npm run build

# Create deployment archive
tar -czf build.tar.gz .next package.json package-lock.json public .env.production
