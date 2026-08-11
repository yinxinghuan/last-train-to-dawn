import { lastTrainToDawn, lastTrainToDawnEn } from './lastTrainToDawn'
import type { Locale, StoryCartridge } from '../types'

export const DEFAULT_CARTRIDGE_ID = 'last-train-to-dawn'
export const CARTRIDGES: Record<string, StoryCartridge> = { 'last-train-to-dawn': lastTrainToDawn }
export const CARTRIDGES_EN: Record<string, StoryCartridge> = { 'last-train-to-dawn': lastTrainToDawnEn }
export function listCartridges(locale: Locale): StoryCartridge[] { return [locale === 'en' ? lastTrainToDawnEn : lastTrainToDawn] }
export function resolveCartridge(_id: string | null | undefined, locale: Locale = 'zh'): StoryCartridge { return locale === 'en' ? lastTrainToDawnEn : lastTrainToDawn }
