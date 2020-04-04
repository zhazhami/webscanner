class Request():
    def __init__(self, method, target, path, headers={}, body=''):
        self.method = method
        self.target = target
        self.path = path
        self.headers = headers
        self.body = body