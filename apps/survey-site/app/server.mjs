// Ported from spikes/sp30/fixtures/site/server.mjs (SP30, adopted 29 Oct 2026).
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { sitePages } from './pages.mjs';
export async function startSite(variant = 'baseline') {
  const pages = sitePages(variant), requests = [];
  const server = createServer((req,res) => {
    requests.push({ method:req.method,path:req.url });
    if (req.method !== 'GET') { res.writeHead(405); res.end('Survey never submits'); return; }
    const path = new URL(req.url,'http://local').pathname, body = pages.body(path);
    res.writeHead(body === null ? 404 : 200, {'content-type':path.endsWith('.xml')?'application/xml':path.endsWith('.txt')?'text/plain':'text/html'});
    res.end(body ?? 'Not found');
  });
  await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
  return { origin:`http://127.0.0.1:${server.address().port}`, requests, close:() => new Promise((resolve,reject) => { server.close(error=>error?reject(error):resolve()); server.closeAllConnections(); }) };
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const site = await startSite(); console.log(site.origin);
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal,async()=>{await site.close();process.exit(0);});
}
