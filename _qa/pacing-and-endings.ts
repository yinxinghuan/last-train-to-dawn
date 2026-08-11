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

