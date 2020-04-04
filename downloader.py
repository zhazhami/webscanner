from utils.request import Request
import asyncio
from aredis import StrictRedis
import json

## 爬取请求并返回链接
class Downloader():
    def __init__(self):
        config = json.load(open('config.json','r'))
        self.client = StrictRedis(host=config['redis']['RDS_HOST'],port=config['redis']['RDS_PORT'],password=config['redis']['RDS_OPTS']['auth_pass'])

    async def put_request(self, req):
        await self.client.lpush('DownloaderQueue',json.dumps(req.__dict__))

    async def get_request(self):
        while True:
            data = await self.client.rpop('EngineQueue')
            if data:
                req = json.loads(data)
                return Request(method=req['method'], target=req['target'], path=req['path'], headers=req['headers'], body=req['body'])
        return None
    
    async def test(self):
        # 插入初始数据
        await self.client.lpush('DownloaderQueue',pickle.dumps(Request('get', 'https://www.baidu.com', '/')))

if __name__ == "__main__":
    downloader = Downloader()