import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { createStorySessionLab } from '../server/storySessionLab'
import { resolveCartridge } from '../src/story/cartridges'
import { buildEndingSnapshot, fallbackEndingCandidate, finalizeEnding } from '../src/story/engine/endingDirector'

const gameBase = '/b2f2886f-46ec-459f-a70f-ab120a7b8edd'
const directory = resolve(process.env.STORY_LAB_UI_DATABASE_DIR ?? '.story-session-lab/ui'); await mkdir(directory, { recursive: true })
const faults = { apiUnavailable: false, dropAndBlock: false }
let modelCalls = 0; let endingCalls = 0
const services = new Map<string, ReturnType<typeof createStorySessionLab>>(); const bases = new Map<string, string>()
for (const locale of ['zh','en'] as const) {
  const cartridge = resolveCartridge(null, locale)
  const service = createStorySessionLab({ cartridge, databasePath: resolve(directory, `${locale}.sqlite`), actorTokens: { 'qa-ui-a':'qa-ui-a','qa-ui-b':'qa-ui-b' },
    generator: { async send() { modelCalls += 1; return { content: locale === 'zh' ? '柴油机恢复稳定怠速，阿达从机舱探出身，确认列车可以继续准备。\n[choices: "搜查西侧燃料棚"|"检查制动与转向架"|"说明上车规则"]' : 'The diesel settles into a steady idle as Ada confirms that the train can continue preparing.\n[choices: "Search the west fuel shed"|"Inspect the brakes and bogies"|"Explain the boarding rules"]' } } },
    endingGenerator: { async generate(save) { endingCalls += 1; const snapshot = buildEndingSnapshot(save, cartridge); const candidate = fallbackEndingCandidate(snapshot, cartridge); return { snapshot, ending: finalizeEnding(candidate, snapshot, false), usedFallback: true, errors: ['QA_FIXTURE'] } } },
  })
  services.set(locale, service); bases.set(locale, (await service.listen()).baseUrl)
}
const vite = await createServer({ configFile: resolve('vite.config.ts'), server: { host:'127.0.0.1', port:Number(process.env.STORY_LAB_UI_PORT ?? 5196), strictPort:true }, plugins:[{ name:'last-train-to-dawn-story-session-qa-only', configureServer(server) { server.middlewares.use(async (request,response,next) => {
  const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
  if (!path.startsWith('/__story_lab/') && !path.startsWith(`${gameBase}/api/story/`)) { next(); return }
  response.setHeader('Cache-Control','no-store')
  try {
    const chunks:Buffer[]=[]; for await (const chunk of request) chunks.push(Buffer.from(chunk)); const requestBody=Buffer.concat(chunks).toString('utf8')
    if (path === '/__story_lab/control' && request.method === 'POST') { const update=JSON.parse(requestBody); if(typeof update.apiUnavailable==='boolean') faults.apiUnavailable=update.apiUnavailable; if(typeof update.dropAndBlock==='boolean') faults.dropAndBlock=update.dropAndBlock; response.setHeader('Content-Type','application/json'); response.end(JSON.stringify({ok:true,faults})); return }
    if (path === '/__story_lab/status' && request.method === 'GET') { response.setHeader('Content-Type','application/json'); response.end(JSON.stringify({ modelCalls, endingCalls, commits:Object.fromEntries([...services].map(([key,value])=>[key,value.committedCount()])), endingCommits:Object.fromEntries([...services].map(([key,value])=>[key,value.endingCommittedCount()])), liveModelCalled:false, liveMediaCalled:false, productionWrites:false, faults })); return }
    if (faults.apiUnavailable) { response.statusCode=503; response.end(JSON.stringify({code:'LAB_API_OFFLINE'})); return }
    const locale=request.headers['x-story-lab-locale']==='en'?'en':'zh'; const actor=request.headers['x-story-lab-actor']==='qa-b'?'qa-ui-b':'qa-ui-a'; const route=(request.url ?? '').slice(gameBase.length)
    const result=await fetch(`${bases.get(locale)}${route}`,{method:request.method,headers:{Authorization:`Bearer ${actor}`,'Content-Type':'application/json'},body:request.method==='GET'?undefined:requestBody}); const payload=await result.text()
    if(result.ok && (path.endsWith('/turns') || path.endsWith('/ending')) && faults.dropAndBlock){faults.dropAndBlock=false;faults.apiUnavailable=true;response.destroy();return}
    response.statusCode=result.status;response.setHeader('Content-Type','application/json');response.end(payload)
  } catch { response.statusCode=500; response.end(JSON.stringify({code:'LAB_PROXY_FAILURE'})) }
}) } }] })
await vite.listen(); console.log(JSON.stringify({url:`http://127.0.0.1:${vite.config.server.port}/_qa/story-session.html`,model:'fixture-only',productionWrites:false}))
let closing=false; for(const signal of ['SIGINT','SIGTERM'] as const) process.on(signal,()=>{if(closing)return;closing=true;void(async()=>{await vite.close();await Promise.all([...services.values()].map(service=>service.close()))})()})
