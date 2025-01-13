rsync -av --exclude 'data' --exclude '.git' --exclude '.venv' --exclude '__pycache__' --exclude '.env' --exclude '.pytest_cache' . root@138.68.163.17:/var/www/news-now/ && ssh root@138.68.163.17 "cd /var/www/news-now && chown -R www-data:www-data . && chmod -R 755 . && systemctl restart news-web && systemctl restart discord-report-bot"

