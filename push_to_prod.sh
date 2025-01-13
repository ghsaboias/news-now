#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

# Check if PROD_SERVER is set
if [ -z "$PROD_SERVER" ]; then
    echo "Error: PROD_SERVER not set in .env file"
    exit 1
fi

rsync -av --exclude 'data' --exclude '.git' --exclude '.venv' --exclude '__pycache__' --exclude '.env' --exclude '.pytest_cache' --exclude 'logs' . root@$PROD_SERVER:/var/www/news-now/ && ssh root@$PROD_SERVER "cd /var/www/news-now && mkdir -p logs && chown -R www-data:www-data . && chmod -R 755 . && chmod 775 logs && systemctl restart news-web && systemctl restart discord-report-bot"
