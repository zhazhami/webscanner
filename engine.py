from utils.request import Request
from scheduler import Scheduler
from spider import Spider
from downloader import Downloader
import asyncio

'''
google-chrome --headless --remote-debugging-address=0.0.0.0 --remote-debugging-port=6666 --no-sandbox --disable-gpu=True --disable-xss-auditor --disable-web-security --allow-running-insecure-content --disable-webgl --disable-popup-blocking
'''

## 调度中心
class Engine():
    def __init__(self, start_url, subdomains):
        self.start_req = Request('get', start_url, '/')
        self.scheduler = Scheduler(subdomains)
        self.spider = Spider()
        self.downloader = Downloader()
        # 加入初始请求
        self.scheduler.put_request(self.start_req)

    async def run(self):
        while True:
            # 1. 取出请求并给Downloader爬取
            if not self.scheduler.req_queue.empty():
                req = self.scheduler.get_request()
                # 请求交由Spider处理
                await self.spider.deal(req)
                await self.downloader.put_request(req)
            # 2. 从Downloader中获取请求
            now_req = await self.downloader.get_request()
            # 3. 请求放入Scheduler
            self.scheduler.put_request(now_req)

engine = Engine("http://acm.hdu.edu.cn:80",["acm.hdu.edu.cn"])
loop = asyncio.get_event_loop()
loop.run_until_complete(engine.run())