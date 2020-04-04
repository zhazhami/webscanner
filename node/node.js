config = require('../config');
const fs = require("fs");
const puppeteer = require('puppeteer');
const redis = require('redis');
const { promisify } = require('util');
global.client = redis.createClient(config.redis.RDS_PORT, config.redis.RDS_HOST, config.redis.RDS_OPTS);
global.lpushAsync = promisify(client.lpush).bind(client);
global.rpopAsync = promisify(client.rpop).bind(client);
global.delAsync = promisify(client.del).bind(client);

(async () => {
  // 启动浏览器
  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    args: [
      '--remote-debugging-address=0.0.0.0',
      '--remote-debugging-port=6666',
      '--no-sandbox',
      '--disable-gpu=True',
      '--disable-xss-auditor',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--disable-webgl',
      '--disable-popup-blocking'
    ]
  })
  console.log("浏览器已启动")


  // const browser = await puppeteer.connect({
  //   browserWSEndpoint: "ws://127.0.0.1:6666/devtools/browser/" + process.argv[2],
  //   defaultViewport: null
  // });
  async function recordRequest(req) {
    // 请求加入redis队列
    await lpushAsync('EngineQueue', JSON.stringify(req))
  }

  async function transRequest(chrome_req) {
    parseUrl = new URL(chrome_req.url());
    target = parseUrl.protocol + "//" + parseUrl.host
    if (parseUrl.host.indexOf(':') == -1) {
      if (parseUrl.protocol == 'https:')
        target += ':443'
      if (parseUrl.protocol == 'http:')
        target += ':80'
    }
    path = parseUrl.pathname + parseUrl.search
    body = chrome_req.postData()
    if (!body) body = ''
    return { "method": chrome_req.method().toLowerCase(), "target": target, "path": path, "headers": chrome_req.headers(), "body": body }
  }

  // 监听控制台事件
  async function console_action(msg) {
    try {
      msg = JSON.parse(msg.text())
      if (msg['url']) {
        parseUrl = new URL(msg['url']);
        target = parseUrl.protocol + "//" + parseUrl.host
        if (parseUrl.host.indexOf(':') == -1) {
          if (parseUrl.protocol == 'https:')
            target += ':443'
          if (parseUrl.scheme == 'http:')
            target += ':80'
        }
        req = Request('get', target, parseUrl.pathname + parseUrl.search)

        if (parseUrl.protocol.startsWith('http'))
          await recordRequest(req)
      }
    } catch (err) {
    }
  }


  // 监听请求
  async function requestIntercepted(req) {
    if (['image', 'media', 'eventsource', 'websocket'].indexOf(req.resourceType()) != -1)
      await req.abort()
    // 禁止重定向
    else if (req.isNavigationRequest() && req.frame().url() != 'about:blank' && !req.frame().parentFrame()) {
      await recordRequest(await transRequest(req))
      await req.respond({
        "status": 204
      })
    }
    else {
      if (['script', 'stylesheet'].indexOf(req.resourceType()) == -1)
        await recordRequest(await transRequest(req))
      await req.continue()
    }
  }

  function recordLink(urls) {
    urls.forEach(url => {
      parseUrl = new URL(url);
      target = parseUrl.protocol + "//" + parseUrl.host
      if (parseUrl.host.indexOf(':') == -1) {
        if (parseUrl.protocol == 'https:')
          target += ':443'
        if (parseUrl.protocol == 'http:')
          target += ':80'
      }
      req = JSON.stringify({ "method": 'get', "target": target, "path": parseUrl.pathname + parseUrl.search, "headers": "", "body": "" })
      if (parseUrl.protocol.startsWith('http'))
        global.lpushAsync('EngineQueue', req)
    })
  }

  function get_link(nodes) {
    let result = [];
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute("src")) result.push(nodes[i].src)
      if (nodes[i].getAttribute("href")) result.push(nodes[i].href)
    }
    return result
  }

  // 抓取页面
  async function get_requests(url) {
    console.log('正在爬取' + url)
    page = await browser.newPage()
    await page.setRequestInterception(true)
    await page.evaluateOnNewDocument(fs.readFileSync('./hook.js', { encoding: 'utf-8' }))
    page.on('request', requestIntercepted)
    page.on('console', console_action);
    await page.goto(url, { "waitUntil": 'load', "timeout": 10000 })
    // 收集链接信息
    recordLink(await page.$$eval('[href]', get_link))
    recordLink(await page.$$eval('[src]', get_link))
    await page.evaluate(fs.readFileSync('./after.js', { encoding: 'utf-8' }))
    try {
      await page.waitForNavigation({ "timeout": 10000 })
    } catch (err) {
    }
    await page.close()
    console.log('--> 完成爬取' + url)
  }


  await delAsync('DownloaderQueue')
  await delAsync('EngineQueue')
  while (true) {
    data = await rpopAsync('DownloaderQueue')
    if (data) {
      req = JSON.parse(data)
      url = req.target + req.path
      await get_requests(url)
    }
  }
})();