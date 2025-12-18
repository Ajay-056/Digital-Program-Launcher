import http.server
import socketserver
import json
from urllib.parse import parse_qs, urlparse
import threading
import time

PORT = 3456
TARGET_LAUNCHES = 2  # Customizable number of launches
COUNTDOWN_SECONDS = 3  # Customizable countdown duration

# Shared state
launched_participants = []
clients = []
lock = threading.Lock()


class SSEHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            with lock:
                response = {
                    "participants": launched_participants,
                    "target": TARGET_LAUNCHES,
                    "countdown": COUNTDOWN_SECONDS,
                }
                self.wfile.write(json.dumps(response).encode("utf-8"))
        elif self.path == "/events":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()

            with lock:
                clients.append(self.wfile)

            try:
                while True:
                    time.sleep(1)  # Keep connection open
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                with lock:
                    if self.wfile in clients:
                        clients.remove(self.wfile)
        else:
            if self.path == "/":
                self.path = "/index.html"
            elif self.path == "/status":
                self.path = "/status.html"

            super().do_GET()

    def do_POST(self):
        if self.path == "/launch":
            content_length = int(self.headers["Content-Length"])
            post_data = self.rfile.read(content_length)
            form_data = parse_qs(post_data.decode("utf-8"))
            name = form_data.get("name", ["Anonymous"])[0]

            with lock:
                if len(launched_participants) < TARGET_LAUNCHES:
                    launched_participants.append(name)

                    # Notify clients of the new user
                    event_data = json.dumps({"type": "new_user", "name": name})
                    for client in clients:
                        try:
                            client.write(f"data: {event_data}\n\n".encode("utf-8"))
                            client.flush()
                        except (
                            BrokenPipeError,
                            ConnectionResetError,
                            ConnectionAbortedError,
                        ):
                            continue  # Client disconnected

                    # Check if target is reached
                    if len(launched_participants) == TARGET_LAUNCHES:
                        launch_event = json.dumps(
                            {
                                "type": "launch",
                                "image_url": "https://raw.githubusercontent.com/Ajay-056/Digital-Program-Launcher/main/Screenshot%202025-12-18%20193648.png",
                            }
                        )
                        for client in clients:
                            try:
                                client.write(
                                    f"data: {launch_event}\n\n".encode("utf-8")
                                )
                                client.flush()
                            except (
                                BrokenPipeError,
                                ConnectionResetError,
                                ConnectionAbortedError,
                            ):
                                continue

            # Send a success response instead of a redirect
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode("utf-8"))
        else:
            self.send_error(404, "File not found")


class ThreadingSimpleServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


Handler = SSEHandler

if __name__ == "__main__":
    with ThreadingSimpleServer(("", PORT), Handler) as httpd:
        print(f"Serving at port {PORT}")
        print(f"Open http://localhost:{PORT} in your browser.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
        httpd.server_close()
        print("Server stopped.")
