import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from '/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'

const baseUrl = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4181/'
const outputDir = process.env.QA_OUT_DIR ?? new URL('./ui/opening-lived-sequence/', import.meta.url).pathname
await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })

async function verify(width, height) {
  const page = await browser.newPage({ viewport: { width, height }, locale: 'zh-CN' })
  await page.route('**/note/telegram/user/get/info/**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ data: { name: '远行者', head_url: '' } }),
  }))
  await page.route('**/alteru-media/api/v1/images/generations', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ task_id: 'qa-opening', request_id: 'qa-opening', type: 'image', status: 'queued', created_at: 0, updated_at: 0 }),
  }))
  await page.goto(`${baseUrl}?story_mode=demo&ui=civic`, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: '#alteru-guest-banner,#alteru-guest-login{display:none!important}' })
  await page.locator('.st-primary').click()
  await page.waitForSelector('.ct-stage__caption')

  const expected = [
    /普通乘客/,
    /救援列车没来/,
    /四十七个人/,
    /钥匙不能让你成为列车长/,
    /我叫阿达/,
    /只能先做一件事/,
  ]
  for (let index = 0; index < expected.length; index += 1) {
    const text = (await page.locator('.ct-stage__caption p').textContent()) ?? ''
    assert.match(text, expected[index], `opening page ${index + 1} must preserve its authored beat`)
    if (index === 0 || index === 3 || index === 4) {
      const label = index === 0 ? 'passenger' : index === 3 ? 'dispatcher' : 'ada-intro'
      await page.screenshot({ path: `${outputDir}opening-${label}-platform-layout-${width}x${height}.png`, fullPage: true })
    }
    if (index < expected.length - 1) {
      assert.equal(await page.locator('.st-composer').count(), 0, `choices must remain hidden on opening page ${index + 1}`)
      await page.locator('.ct-stage__caption-page').click()
    }
  }
  await page.waitForSelector('.st-composer')
  assert.equal(await page.locator('.st-quick-replies button').count(), 3)
  assert.equal(await page.locator('.ct-stage__caption-page').count(), 0, 'the final opening page hands control to choices instead of looping')
  const size = await page.evaluate(() => ({ width: document.body.scrollWidth, height: document.body.scrollHeight }))
  assert.equal(size.width, width)
  assert.equal(size.height, height)
  await page.screenshot({ path: `${outputDir}opening-final-platform-layout-${width}x${height}.png`, fullPage: true })
  await page.close()
}

await verify(320, 568)
await verify(390, 844)
await browser.close()
console.log(JSON.stringify({ ok: true, pages: 6, choicesAfterFinalPage: 3, viewports: ['320x568', '390x844'] }))
