#!/bin/bash

# Configuration
SERVER="root@138.68.163.17"
REMOTE_DIR="/root/news-web"
LOCAL_DIR="."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment to aiworld.com.br...${NC}"

# 1. Sync web files
echo -e "\n${GREEN}📂 Copying web files...${NC}"
rsync -avz --progress ./web/ $SERVER:$REMOTE_DIR/web/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Files copied successfully${NC}"
else
    echo -e "${RED}❌ Error copying files${NC}"
    exit 1
fi

# 2. Set up service file and restart services
echo -e "\n${GREEN}🔄 Setting up service and restarting...${NC}"
ssh $SERVER << 'EOF'
    # Create service file
    cat > /etc/systemd/system/news-now-web.service << 'SERVICEEOF'
[Unit]
Description=News Now Web Application
After=network.target

[Service]
User=root
Group=root
WorkingDirectory=/root/news-web/web
Environment="PATH=/root/news-web/.venv/bin"
Environment="PYTHONPATH=/root/news-web"
ExecStart=/root/news-web/.venv/bin/gunicorn app:app -c gunicorn.conf.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICEEOF

    # Set proper permissions
    chown -R root:root /root/news-web
    chmod -R 755 /root/news-web
    chmod 644 /etc/systemd/system/news-now-web.service

    # Reload systemd and restart service
    systemctl daemon-reload
    systemctl enable news-now-web
    systemctl restart news-now-web

    # Check service status
    if systemctl is-active --quiet news-now-web; then
        echo "✅ Web service restarted successfully"
        systemctl status news-now-web --no-pager
    else
        echo "❌ Error: Web service failed to restart"
        systemctl status news-now-web --no-pager
        exit 1
    fi
EOF

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"
    echo -e "🌎 Website should be updated at https://aiworld.com.br"
else
    echo -e "\n${RED}❌ Deployment failed${NC}"
    exit 1
fi 