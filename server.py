from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlencode, urlparse, parse_qs
from urllib.request import urlopen, Request


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/timezone":
            query = parse_qs(parsed.query).get("q", [""])[0]
            self.proxy(f"https://api.myhumandesign.com/timezone?{urlencode({'q': query})}")
            return
        super().do_GET()

    def proxy(self, url):
        try:
            req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(req, timeout=20) as res:
                body = res.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
        except Exception as exc:
            self.send_response(502)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(('{ "error": "%s" }' % str(exc).replace('"', "'")).encode())


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8789), Handler).serve_forever()
