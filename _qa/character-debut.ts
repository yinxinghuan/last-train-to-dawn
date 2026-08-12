import assert from 'node:assert/strict'
import { lastTrainToDawn } from '../src/story/cartridges/lastTrainToDawn'
import { parseStoryProtocol } from '../src/story/engine/protocol'
import { applyParsedScene, createInitialSave, normalizeCharacterState } from '../src/story/engine/reducer'
import type { StoryCharacter } from '../src/story/types'

const initial = createInitialSave(lastTrainToDawn)
assert.deepEqual(initial.characters.map((character) => character.id), ['ada-mechanic'])

const definition = lastTrainToDawn.characters.find((character) => character.id === 'ren-medic')
assert(definition?.hiddenUntilIntroduced)
const legacy: StoryCharacter = { ...definition, status: 'known', origin: 'cartridge', updatedAtScene: 0 }
const repaired = normalizeCharacterState({ ...initial, characters: [...initial.characters, legacy], partyMemberIds: [], relationships: [] }, lastTrainToDawn)
assert.equal(repaired.characters.some((character) => character.id === 'ren-medic'), false)

const introduced = applyParsedScene(initial, parseStoryProtocol(`一个背着不完整急救箱的男人先蹲下登记伤员，才抬头说自己姓任，是留下来处理最后两名病人的乡镇急诊医生。
[character_update: character_id="ren-medic" character="任医生" role="乡镇急诊医生" detail="带着不完整的急救箱，主动负责伤员登记" lore="为最后两名病人缝合而错过撤离车"]
[choices: "请任医生检查孩子"|"让阿达继续检修"|"先稳定候车厅秩序"]`, 'zh'), lastTrainToDawn, '进入候车厅')
const doctor = introduced.characters.find((character) => character.id === 'ren-medic')
assert(doctor)
assert.equal(doctor.origin, 'cartridge')
assert(introduced.choices.some((choice) => choice.label.includes('任医生')))

const preserved = normalizeCharacterState({ ...introduced, relationships: introduced.relationships }, lastTrainToDawn)
assert(preserved.characters.some((character) => character.id === 'ren-medic'))
assert.equal(preserved.characters.some((character) => character.id === 'lin-scout'), false)
assert.equal(preserved.characters.some((character) => character.id === 'mara-raider'), false)

console.log(JSON.stringify({ ok: true, openingRoster: ['ada-mechanic'], repairedLegacy: true, introduced: doctor.id }))
