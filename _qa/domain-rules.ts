import assert from 'node:assert/strict'
import { lastTrainToDawn, lastTrainToDawnEn } from '../src/story/cartridges/lastTrainToDawn'
import { domainOwnsDanger, resolveDomainAction } from '../src/story/engine/domainRules'
import { parseStoryProtocol } from '../src/story/engine/protocol'
import { applyParsedScene, createInitialSave } from '../src/story/engine/reducer'
import type { StoryCartridge, StorySave } from '../src/story/types'

function play(save: StorySave, cartridge: StoryCartridge, action: string, hostileModel = '') {
  const domain = resolveDomainAction(save, cartridge, action)
  const model = hostileModel || `行动产生了可见结果。\n[choices: "继续处理当前问题"|"检查列车状态"|"与同伴讨论"]`
  const next = applyParsedScene(save, parseStoryProtocol(model, cartridge.locale), cartridge, action, undefined, undefined, undefined, domain)
  return { next, domain }
}

function itemCount(save: StorySave, id: string) {
  return save.inventory.find((item) => item.id === id)?.count ?? 0
}

function metric(save: StorySave, itemId: string, metricId: string) {
  return save.inventory.find((item) => item.id === itemId)?.metrics?.find((entry) => entry.id === metricId)?.value
}

for (const cartridge of [lastTrainToDawn, lastTrainToDawnEn]) {
  const ids = cartridge.domainRules?.rules.map((rule) => rule.id) ?? []
  assert.equal(ids.length, 8)
  assert.equal(new Set(ids).size, ids.length)
}

let save = createInitialSave(lastTrainToDawn)
assert.equal(metric(save, 'master-switch-key', 'remaining-overrides'), '3')

// Illegal route attempts remain atomic even when the model tries to grant the route and resources.
let turn = play(save, lastTrainToDawn, '走河谷支线寻找氧气', `你强行让列车驶入河谷。
[map_update: new_location="河谷断桥"]
[fact: id="route-family" value="valley"]
[widget: fuel, add: 20]
[party_change: character_id="ada-mechanic" character="阿达" change="add"]
[choices: "继续"|"再走"|"抵达"]`)
assert.equal(turn.domain?.status, 'rejected')
assert.equal(turn.next.facts['route-family'], 'unset')
assert.equal(turn.next.stats.fuel, 68)
assert.equal(turn.next.map.find((node) => node.current)?.id, 'dead-station')
assert.deepEqual(turn.next.partyMemberIds, [])
assert.deepEqual(turn.next.choices.map((choice) => choice.label), ['和阿达检修启动机', '搜查西侧燃料棚', '检查制动与转向架'])
save = turn.next

// Starter repair is awarded once and model-authored duplicate effects are ignored.
turn = play(save, lastTrainToDawn, '我和阿达一起检修启动机', `继电器重新接通。
[widget: condition, add: 22]
[widget: fuel, add: 20]
[inventory: action="add" item_id="sealed-diesel" item="铅封柴油桶" count="9"]
[fact: id="fuel-shed-salvaged" value="true"]
[fact: id="starter-repaired" value="false"]
[party_change: character_id="ada-mechanic" character="阿达" change="add"]
[choices: "搜查燃料棚"|"检查制动"|"说明规则"]`)
assert.equal(turn.domain?.status, 'accepted')
assert.equal(turn.next.stats.condition, 87)
assert.equal(turn.next.facts['starter-repaired'], true)
assert.deepEqual(turn.next.partyMemberIds, ['ada-mechanic'])
assert.equal(turn.next.stats.fuel, 68)
assert.equal(itemCount(turn.next, 'sealed-diesel'), 0)
assert.notEqual(turn.next.facts['fuel-shed-salvaged'], true)
save = turn.next
turn = play(save, lastTrainToDawn, '再修一次启动机', `[widget: condition, add: 22]
[choices: "模型错误一"|"模型错误二"|"模型错误三"]`)
assert.equal(turn.domain?.status, 'rejected')
assert.equal(turn.next.stats.condition, 87)
assert.deepEqual(turn.next.choices.map((choice) => choice.label), ['搜查西侧燃料棚', '检查制动与转向架', '说明上车规则'])
save = turn.next

// The hose transaction requires inspection, consumes the item once, and cannot partially repeat.
turn = play(save, lastTrainToDawn, '立即换管')
assert.equal(turn.domain?.status, 'rejected')
assert.equal(itemCount(turn.next, 'spare-hose'), 1)
assert.equal(turn.next.stats.condition, 87)
save = turn.next
turn = play(save, lastTrainToDawn, '让阿达检查制动和转向架')
assert.equal(turn.domain?.status, 'accepted')
assert.equal(turn.next.facts['brake-hose-warning'], true)
save = turn.next
turn = play(save, lastTrainToDawn, '消耗备件立即换管', `[inventory: action="remove" item_id="spare-hose" item="制动软管" count="5"]
[widget: condition, add: 22]
[fact: id="brake-hose-warning" value="true"]
[choices: "修启动机"|"搜燃料"|"说明规则"]`)
assert.equal(turn.domain?.status, 'accepted')
assert.equal(itemCount(turn.next, 'spare-hose'), 0)
assert.equal(turn.next.stats.condition, 97)
assert.equal(turn.next.facts['brake-hose-warning'], false)
assert.equal(turn.next.facts['brake-hose-replaced'], true)
save = turn.next
turn = play(save, lastTrainToDawn, '再用制动软管换一次')
assert.equal(turn.domain?.status, 'rejected')
assert.equal(turn.next.stats.condition, 97)
save = turn.next

// Fuel salvage is a one-time transaction.
turn = play(save, lastTrainToDawn, '去燃料棚找柴油', `[inventory: action="add" item_id="sealed-diesel" item="铅封柴油桶" count="9"]
[widget: fuel, add: 20]
[fact: id="fuel-shed-salvaged" value="false"]
[choices: "接纳三人"|"检查孩子"|"返回列车"]`)
assert.equal(turn.domain?.status, 'accepted')
assert.equal(itemCount(turn.next, 'sealed-diesel'), 2)
assert.equal(turn.next.stats.fuel, 82)
assert.equal(turn.next.facts['fuel-shed-salvaged'], true)
save = turn.next
turn = play(save, lastTrainToDawn, '再搜查一次燃料棚')
assert.equal(turn.domain?.status, 'rejected')
assert.equal(itemCount(turn.next, 'sealed-diesel'), 2)
assert.equal(turn.next.stats.fuel, 82)
save = turn.next

// Route commitment uses stable map ids and cannot be rewritten by a second branch choice.
turn = play(save, lastTrainToDawn, '走河谷支线寻找氧气', `[map_update: new_location="模型捏造地点"]
[fact: id="route-family" value="forest"]
[widget: fuel, remove: 20]
[choices: "正面处理"|"交涉救援"|"侦察绕路"]`)
assert.equal(turn.domain?.status, 'accepted')
assert.equal(turn.next.facts['route-family'], 'valley')
assert.equal(turn.next.map.find((node) => node.current)?.id, 'river-valley')
assert.equal(turn.next.stats.fuel, 76)
save = turn.next
turn = play(save, lastTrainToDawn, '现在改走采石场线')
assert.equal(turn.domain?.status, 'rejected')
assert.equal(turn.next.facts['route-family'], 'valley')
assert.equal(turn.next.map.find((node) => node.current)?.id, 'river-valley')
save = turn.next

// The key needs an active danger, owns its cost, and has exactly three uses.
turn = play(save, lastTrainToDawn, '使用总调度钥匙打开维修岔线')
assert.equal(turn.domain?.status, 'rejected')
assert.equal(turn.next.facts['switch-key-uses'], 0)
save = turn.next
for (let use = 1; use <= 3; use += 1) {
  save = { ...save, danger: { ...save.danger, phase: use % 2 ? 'warning' : 'confrontation', currentThreat: `blocked-route-${use}`, severity: 3 } }
  const resolution = resolveDomainAction(save, lastTrainToDawn, '用总调度钥匙切入侧线')
  assert.equal(resolution?.status, 'accepted')
  assert(domainOwnsDanger(resolution))
  const played = applyParsedScene(save, parseStoryProtocol(`[fact: id="switch-key-uses" value="99"]
[widget: fuel, remove: 20]
[encounter: phase="resolution" kind="fake" severity="5" outcome="failure"]
[choices: "救人"|"转移氧气"|"检查反锁"]`, 'zh'), lastTrainToDawn, '用总调度钥匙切入侧线', undefined, undefined, undefined, resolution)
  assert.equal(played.facts['switch-key-uses'], use)
  assert.equal(played.stats.fuel, 76 - use * 8)
  assert.equal(played.danger.phase, 'calm')
  assert.equal(played.danger.lastOutcome, 'success')
  assert.equal(metric(played, 'master-switch-key', 'remaining-overrides'), String(3 - use))
  save = played
}
save = { ...save, danger: { ...save.danger, phase: 'warning', currentThreat: 'fourth-lock', severity: 3 } }
turn = play(save, lastTrainToDawn, '第四次使用总调度钥匙')
assert.equal(turn.domain?.status, 'rejected')
assert.equal(turn.next.facts['switch-key-uses'], 3)
assert.equal(turn.next.stats.fuel, 52)
assert.equal(metric(turn.next, 'master-switch-key', 'remaining-overrides'), '0')
assert.equal(turn.next.danger.phase, 'warning')

assert.equal(resolveDomainAction(turn.next, lastTrainToDawn, '我想和阿达聊聊她为什么留下'), undefined, 'unmanaged free actions remain available to AI')

console.log(JSON.stringify({
  ok: true,
  rules: 8,
  final: {
    fuel: turn.next.stats.fuel,
    condition: turn.next.stats.condition,
    morale: turn.next.stats.morale,
    route: turn.next.facts['route-family'],
    keyUses: turn.next.facts['switch-key-uses'],
    keyRemaining: metric(turn.next, 'master-switch-key', 'remaining-overrides'),
    currentMapId: turn.next.map.find((node) => node.current)?.id,
  },
}))
