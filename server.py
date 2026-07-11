from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    pass


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8789), Handler).serve_forever()
