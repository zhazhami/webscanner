from utils.request import Request
import asyncio
import time
import json
from aredis import StrictRedis

class Spider():
    def __init__(self):
        self.client = StrictRedis(host='111.229.211.71',port='8765',password='zzm199585')
    
    async def deal(self, req):
        print("请求方法:%s  url: %s" % (req.method,req.target+req.path))
        await self.client.lpush('SpiderQueue',json.dumps(req.__dict__))