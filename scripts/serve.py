"""Local static preview with the same isolation headers as production."""
import http.server
import os
from pathlib import Path

os.chdir(Path(__file__).resolve().parents[1] / 'site')
class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

http.server.ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('PORT','18867'))), Handler).serve_forever()
