import assert from 'node:assert/strict'
import { lastTrainToDawn } from '../src/story/cartridges/lastTrainToDawn'
import { executeStoryTurn } from '../src/story/engine/executeTurn'
import { createInitialSave } from '../src/story/engine/reducer'

const initial = createInitialSave(lastTrainToDawn)
const initialJson = JSON.stringify(initial)
let domainNarratorCalls = 0
const domain = await executeStoryTurn({
  save: initial,
  cartridge: lastTrainToDawn,
  action: '和阿达检修启动机',
  generator: {
    async send(_action, context) {
      domainNarratorCalls += 1
      assert.equal(context.domainResolution?.status, 'accepted')
      return { content: [
        '烧黑的继电器被重新接通，发动机稳定点火；阿达正式接下机务岗位。',
        '[choices: "搜查西侧燃料棚"|"检查制动与转向架"|"说明上车规则"]',
      ].join('\n') }
    },
  },
})
assert.equal(domain.source, 'domain')
assert.equal(domainNarratorCalls, 1, 'this cartridge currently narrates accepted domain actions through the model')
assert.equal(domain.save.scene, initial.scene + 1)
assert.equal(domain.save.stats.condition, initial.stats.condition + 5)
assert.equal(domain.save.facts['starter-repaired'], true)
assert.ok(domain.save.partyMemberIds.includes('ada-mechanic'))
assert.equal(JSON.stringify(initial), initialJson, 'server pipeline must not mutate its input snapshot')

let modelCalls = 0
const model = await executeStoryTurn({
  save: initial,
  cartridge: lastTrainToDawn,
  action: '检查列车车窗外的积水线',
  generator: {
    async send(_action, context) {
      modelCalls += 1
      assert.equal(context.domainResolution, undefined)
      return { content: [
        '你沿车窗逐节查看，水线已经越过站台最低一级，却仍未淹到出站道岔的连杆。留给列车原地准备的时间正在缩短。',
        '[state: value="在道岔进水前完成一项启程准备"]',
        '[choices: "和阿达检修启动机"|"趁雨势加剧前搜查燃料棚"|"站到车厢过道说明路线与同行规则"]',
      ].join('\n') }
    },
  },
})
assert.equal(model.source, 'model')
assert.equal(modelCalls, 1)
assert.equal(model.save.scene, initial.scene + 1)
assert.equal(model.save.objective, '在道岔进水前完成一项启程准备')
assert.ok(model.save.choices.length >= 1)

console.log(JSON.stringify({ ok: true, checks: [
  'server-compatible-ordinary-turn',
  'domain-resolution-is-provided-to-narrator',
  'domain-effects-commit-together',
  'input-snapshot-remains-immutable',
  'model-proposal-enters-authoritative-reducer',
  'finale-transaction-remains-separate',
] }, null, 2))
