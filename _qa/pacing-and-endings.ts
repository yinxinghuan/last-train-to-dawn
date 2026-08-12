import assert from 'node:assert/strict'
import { lastTrainToDawn, lastTrainToDawnEn } from '../src/story/cartridges/lastTrainToDawn'
import { availableEndingCapabilities, buildEndingSnapshot, canStartTrueEnding, fallbackEndingCandidate, validateEndingCandidate } from '../src/story/engine/endingDirector'
import { createInitialSave } from '../src/story/engine/reducer'

for (const cartridge of [lastTrainToDawn, lastTrainToDawnEn]) {
  assert.equal(cartridge.director?.chapters?.length, 8)
  assert.equal(cartridge.endingDirector?.capabilities.length, 8)
  assert.equal(cartridge.endingDirector?.anchors.length, 8)
  assert((cartridge.director?.maxActiveThreads ?? 99) <= 2)
  assert(cartridge.director?.generationRules.some((rule) => /第一句|first sentence/i.test(rule)))
  assert(cartridge.director?.generationRules.some((rule) => /1–2|1-2/.test(rule)))
  assert.equal(cartridge.opening.blocks.length, 6)
  assert(cartridge.opening.blocks[0]?.text.match(/普通乘客|ordinary passenger/i))
  assert(cartridge.opening.blocks[2]?.text.match(/四十七.*柴油车厢|forty-seven.*diesel carriages/i))
  assert(cartridge.opening.blocks[3]?.text.match(/不能让你成为列车长|cannot make you a conductor/i))
  assert.equal(cartridge.opening.blocks[3]?.kind, 'dialogue')
  assert(cartridge.opening.blocks[4]?.text.match(/我叫阿达|I.m Ada/i))
  assert(cartridge.opening.blocks[4]?.text.match(/不靠电网|does not need the electric grid/i))
  assert(cartridge.opening.blocks[5]?.text.match(/只能先做一件事|one thing first/i))
  assert(cartridge.opening.objective.match(/柴油列车.*铁路支线|diesel train.*railway branch/i))
  assert(cartridge.sceneImageAvoid?.match(/road car.*bus.*subway.*metro/i))

  const save = createInitialSave(cartridge)
  save.scene = 30
  save.facts['chapter-bridge-complete'] = true
  save.facts['passenger-rules-public'] = true
  save.stats.fuel = 60
  save.stats.condition = 70
  save.stats.morale = 75
  const ada = save.characters.find((character) => character.id === 'ada-mechanic')
  assert(ada)
  ada.status = 'companion'
  save.partyMemberIds = ['ada-mechanic']

  assert(canStartTrueEnding(save, cartridge))
  assert(availableEndingCapabilities(save, cartridge).length >= 5)
  const snapshot = buildEndingSnapshot(save, cartridge)
  const candidate = fallbackEndingCandidate(snapshot, cartridge)
  assert.deepEqual(validateEndingCandidate(candidate, snapshot, cartridge), [])
}

console.log(JSON.stringify({ ok: true, chapters: 8, endingCapabilities: 8, endingAnchors: 8, pace: 'brisk' }))
