#coding: utf-8
from utils.request import Request
from urllib import parse
import re
import queue

# 请求队列
class Scheduler():
    def __init__(self, subdomains):
        # url去重
        self.req_hash = set()
        self.req_queue = queue.Queue()
        # 允许的子域名
        self.subdomains = subdomains
    
    def in_subdomains(self, url):
        domain = parse.urlparse(url).netloc.split(':')[0]
        for subdomain in self.subdomains:
            if domain.endswith(subdomain):
                return True
        return False

    def is_static(self, path):
        path = path.split('?')[0]
        suffix = path.split('.')[-1].lower()
        if suffix in ['css','js','jpg','png','pdf','gif','zip','tar','txt']:
            return True
        return False

    def is_action(self, k, v):
        if 'action' in k.lower():
            return True
        return False

    def is_data(self, k, v):
        # 判断参数key是否是可去重的
        if re.search(r'[^\x00-\x7F]+', v) or v.isdigit() or 'page' in k.lower() or 'user' in k.lower():
            return True
        return False

    def split_query(self, item):
        item = item.split('=')
        if len(item) == 0:
            return ['', '']
        elif len(item) == 1:
            return [item[0], '']
        return [item[0],'='.join(item[1:])]

    def get_request_hash(self, req):
        path_split = req.path.split('?')
        norm_uri = ''.join([req.target, path_split[0]])
        query = ''
        if len(path_split) > 1:
            query = path_split[1]
        # 请求参数规范化
        new_query = []
        for k, v in map(self.split_query, query.split('&')):
            if self.is_data(k, v) and not self.is_action(k, v):
                new_query.append('='.join([k, '[data]']))
            else:
                new_query.append('='.join([k, v]))
        new_query = '&'.join(new_query)
        return '?'.join([norm_uri, new_query])

    def put_request(self, req):
        now_req_hash = self.get_request_hash(req)
        if now_req_hash not in self.req_hash and self.in_subdomains(req.target) and not self.is_static(req.path):
            self.req_queue.put(req)
        self.req_hash.add(now_req_hash)

    def get_request(self):
        return self.req_queue.get()


if __name__ == "__main__":
    req = Request('get', 'http://s:80', '/')
    scheduler = Scheduler()
    a = scheduler.get_request_hash(req)
    print(a)
