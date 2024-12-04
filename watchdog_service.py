import time
import os
import subprocess
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class ServiceRestartHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith('main.py'):
            print(f"Change detected in {event.src_path}")
            try:
                subprocess.run(['sudo', 'systemctl', 'restart', 'discord-report-bot'], check=True)
                print("Service restarted successfully")
            except subprocess.CalledProcessError as e:
                print(f"Failed to restart service: {e}")

def main():
    path = os.path.dirname(os.path.abspath(__file__))
    event_handler = ServiceRestartHandler()
    observer = Observer()
    observer.schedule(event_handler, path, recursive=False)
    observer.start()
    print(f"Watching for changes in {path}/main.py")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    main()
