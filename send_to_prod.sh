scp -r ./* root@138.68.163.17:/var/www/news-now

# Update permissions
ssh root@138.68.163.17 "cd /var/www/news-now && \
    chown -R www-data:www-data . && \
    chmod -R 755 . && \
    systemctl restart news-web nginx && \
    systemctl restart discord-report-bot"