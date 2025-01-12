import multiprocessing

# Gunicorn configuration for production
bind = "0.0.0.0:5000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = "access.log"
errorlog = "error.log"
loglevel = "info"

# Process naming
proc_name = "news_now_web"

# SSL (if not using Nginx)
# keyfile = "path/to/keyfile"
# certfile = "path/to/certfile"

# Security
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190 