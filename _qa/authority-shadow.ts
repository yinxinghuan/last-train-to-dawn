import assert from 'node:assert/strict'
import { lastTrainToDawn } from '../src/story/cartridges/lastTrainToDawn'
import { createAuthorityShadowSample } from '../src/story/engine/authorityShadow'
import { createInitialSave } from '../src/story/engine/reducer'
const save = createInitialSave(lastTrainToDawn); const visible = JSON.stringify(save.choices); const sample = createAuthorityShadowSample(save, lastTrainToDawn)
assert.equal(JSON.stringify(save.choices), visible); assert.equal(sample.choices.length, save.choices.length); assert.equal(sample.emptyTray, false); assert.ok(sample.choices.every((choice) => ['accepted', 'rejected', 'open'].includes(choice.status))); assert.equal(createAuthorityShadowSample({ ...save, entered: true, choices: [], sessionEnded: false }, lastTrainToDawn).emptyTray, true)
console.log('last-train-to-dawn authority shadow is observational: ok')
