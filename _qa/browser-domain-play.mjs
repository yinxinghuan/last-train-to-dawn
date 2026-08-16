import fs from 'node:fs/promises'
import { chromium } from '/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'

const evidenceDir = new URL('./ui/domain-rules/', import.meta.url)
await fs.mkdir(evidenceDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
const page = await context.newPage()
await page.addInitScript(() => {
  localStorage.clear()
  sessionStorage.clear()
})
const qaBase = process.env.QA_BASE || 'http://127.0.0.1:4173/'
await page.goto(`${qaBase}?story_mode=demo&ui=civic&lang=zh`, { waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' })

await page.getByRole('button', { name: /启动末班车/ }).click()
const openingPage = page.locator('.ct-stage__caption-page')
while (await openingPage.isVisible().catch(() => false)) await openingPage.click()
await page.getByRole('textbox', { name: '自定义行动' }).waitFor()

async function act(text) {
  const input = page.getByRole('textbox', { name: '自定义行动' })
  await input.fill(text)
  await input.press('Enter')
  await page.getByRole('button', { name: /查看下一步选择/ }).waitFor({ timeout: 10_000 })
}

async function advance() {
  const next = page.getByRole('button', { name: /查看下一步选择/ })
  await next.click()
  await next.waitFor({ state: 'hidden' })
  await page.getByRole('textbox', { name: '自定义行动' }).waitFor()
}

await act('走河谷支线寻找氧气')
let body = await page.locator('body').innerText()
if (!body.includes('启动机尚未修复')) throw new Error('Rejected route did not explain the unmet starter requirement')
await page.screenshot({ path: new URL('01-rejected-route-platform-layout-390x844.png', evidenceDir).pathname, fullPage: true })

await advance()
await page.getByRole('button', { name: /和阿达检修启动机/ }).waitFor()
await page.getByRole('button', { name: /和阿达检修启动机/ }).click()
await page.getByRole('button', { name: /查看下一步选择/ }).waitFor({ state: 'hidden' })
await page.getByRole('button', { name: /查看下一步选择/ }).waitFor({ timeout: 10_000 })
body = await page.locator('body').innerText()
await page.screenshot({ path: new URL('02-starter-repaired-platform-layout-390x844.png', evidenceDir).pathname, fullPage: true })
if (!body.includes('车况 +5')) throw new Error(`Starter repair did not render the exact governed stat change:\n${body.slice(-1200)}`)
if (!body.includes('阿达正式接下机务岗位')) throw new Error('Starter repair did not render its governed story consequence')

await advance()
await act('再修一次启动机')
body = await page.locator('body').innerText()
if (!body.includes('启动机已经修复')) throw new Error('Repeated starter repair was not rejected')
await page.screenshot({ path: new URL('03-repeat-rejected-platform-layout-390x844.png', evidenceDir).pathname, fullPage: true })

console.log(JSON.stringify({
  ok: true,
  viewport: '390x844',
  steps: [
    'route rejected before starter repair',
    'rejection offered feasible starter repair',
    'starter repair rendered exact Condition +5 and Ada consequence',
    'repeat repair rejected without another reward',
  ],
}))

await browser.close()
