export type HeroScene = 'morning' | 'night'

export const HERO_SCENE_EVENT = 'gridora:hero-scene'

// Browser-only: call from effects or event handlers. Lets the header follow the hero's
// time of day without the two components sharing React state.
export const announceHeroScene = (scene: HeroScene | null): void => {
  const root = document.documentElement

  if (scene) root.dataset.heroScene = scene
  else delete root.dataset.heroScene

  window.dispatchEvent(new CustomEvent<HeroScene | null>(HERO_SCENE_EVENT, { detail: scene }))
}

export const readHeroScene = (): HeroScene | null => {
  const value = document.documentElement.dataset.heroScene

  return value === 'morning' || value === 'night' ? value : null
}
