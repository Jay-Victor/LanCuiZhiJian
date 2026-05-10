export interface BackgroundPreset {
  id: string
  nameKey: string
  category: 'solid' | 'ink' | 'nature' | 'minimal'
  light: string
  dark: string
}

export const solidPresets: BackgroundPreset[] = [
  { id: 'rice-white', nameKey: 'settings.bgPresetRiceWhite', category: 'solid', light: '#f5f0eb', dark: '#1a1815' },
  { id: 'ivory', nameKey: 'settings.bgPresetIvory', category: 'solid', light: '#fffff0', dark: '#1c1c15' },
  { id: 'moon-white', nameKey: 'settings.bgPresetMoonWhite', category: 'solid', light: '#d6ecf0', dark: '#1a2a30' },
  { id: 'goose-yellow', nameKey: 'settings.bgPresetGooseYellow', category: 'solid', light: '#f0e68c', dark: '#2a2810' },
  { id: 'bamboo-green', nameKey: 'settings.bgPresetBambooGreen', category: 'solid', light: '#789262', dark: '#2a3d20' },
  { id: 'indigo', nameKey: 'settings.bgPresetIndigo', category: 'solid', light: '#065279', dark: '#0a2a3d' },
  { id: 'cinnabar', nameKey: 'settings.bgPresetCinnabar', category: 'solid', light: '#c04851', dark: '#3d1518' },
  { id: 'ochre', nameKey: 'settings.bgPresetOchre', category: 'solid', light: '#a75c2a', dark: '#2d1a0a' },
  { id: 'tea-brown', nameKey: 'settings.bgPresetTeaBrown', category: 'solid', light: '#8b6914', dark: '#2a2008' },
  { id: 'stone-green', nameKey: 'settings.bgPresetStoneGreen', category: 'solid', light: '#16a951', dark: '#0a3020' },
  { id: 'ink-black', nameKey: 'settings.bgPresetInkBlack', category: 'solid', light: '#2c2c2c', dark: '#0a0a0a' },
  { id: 'lead-white', nameKey: 'settings.bgPresetLeadWhite', category: 'solid', light: '#e9e7ef', dark: '#1e1c25' },
]

export interface GradientPreset {
  id: string
  nameKey: string
  category: 'ink' | 'nature' | 'minimal'
  light: string
  dark: string
}

export const gradientPresets: GradientPreset[] = [
  { id: 'ink-wash', nameKey: 'settings.bgPresetInkWash', category: 'ink', light: 'linear-gradient(135deg, #2c3e50 0%, #4a6741 25%, #8ba58e 50%, #c5d5c5 75%, #e8ede8 100%)', dark: 'linear-gradient(135deg, #1a252f 0%, #2d3d28 25%, #4d5d4e 50%, #6b7d6b 75%, #8a9a8a 100%)' },
  { id: 'ink-mist', nameKey: 'settings.bgPresetInkMist', category: 'ink', light: 'linear-gradient(180deg, #d5dfe6 0%, #b8c9d6 20%, #9ab0bf 40%, #7d97a8 60%, #5f7e91 80%, #4a6575 100%)', dark: 'linear-gradient(180deg, #1e2a33 0%, #243540 20%, #2a404d 40%, #304b5a 60%, #365667 80%, #3c6174 100%)' },
  { id: 'ink-landscape', nameKey: 'settings.bgPresetInkLandscape', category: 'ink', light: 'linear-gradient(to bottom, #e8ece8 0%, #c5d0c5 15%, #8fa88f 35%, #5a7a5a 55%, #3d5c3d 75%, #2a4a3a 100%)', dark: 'linear-gradient(to bottom, #1a2a1a 0%, #1e3020 15%, #254028 35%, #2d5030 55%, #356038 75%, #3d7040 100%)' },
  { id: 'ink-splash', nameKey: 'settings.bgPresetInkSplash', category: 'ink', light: 'radial-gradient(ellipse at 30% 40%, #3d3d3d 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, #2a2a2a 0%, transparent 40%), linear-gradient(135deg, #f5f0eb 0%, #e8e0d5 100%)', dark: 'radial-gradient(ellipse at 30% 40%, #1a1a1a 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, #111 0%, transparent 40%), linear-gradient(135deg, #1a1815 0%, #15120e 100%)' },
  { id: 'rice-paper', nameKey: 'settings.bgPresetRicePaper', category: 'ink', light: 'linear-gradient(145deg, #f5efe0 0%, #ede5d3 30%, #e5dbc5 60%, #ddd1b7 100%)', dark: 'linear-gradient(145deg, #2a2518 0%, #252014 30%, #201c10 60%, #1b180c 100%)' },
  { id: 'sunset-ink', nameKey: 'settings.bgPresetSunsetInk', category: 'ink', light: 'linear-gradient(to bottom, #2c3e50 0%, #4a5568 20%, #7a5c6b 40%, #b87a6e 60%, #d4a574 80%, #e8c89e 100%)', dark: 'linear-gradient(to bottom, #111820 0%, #1a2030 20%, #2a1e28 40%, #3d2225 60%, #4a3028 80%, #574030 100%)' },
  { id: 'moonlit-river', nameKey: 'settings.bgPresetMoonlitRiver', category: 'ink', light: 'linear-gradient(180deg, #1a2a3a 0%, #2a3a4a 20%, #3a4a5a 40%, #4a5a6a 60%, #8aa0b5 80%, #b8c8d8 100%)', dark: 'linear-gradient(180deg, #0a1018 0%, #0e1820 20%, #122028 40%, #162830 60%, #1e3845 80%, #26485a 100%)' },
  { id: 'celadon-glaze', nameKey: 'settings.bgPresetCeladon', category: 'nature', light: 'linear-gradient(135deg, #a8c8b8 0%, #7dab96 30%, #5a8e78 60%, #3d7a5e 100%)', dark: 'linear-gradient(135deg, #2d4a3d 0%, #245038 30%, #1b5633 60%, #125c2e 100%)' },
  { id: 'azure-sky', nameKey: 'settings.bgPresetAzureSky', category: 'nature', light: 'linear-gradient(180deg, #87ceeb 0%, #6bb5d4 30%, #559cbd 60%, #4083a6 100%)', dark: 'linear-gradient(180deg, #1a3a4d 0%, #1e4558 30%, #225063 60%, #265b6e 100%)' },
  { id: 'indigo-dye', nameKey: 'settings.bgPresetIndigoDye', category: 'nature', light: 'linear-gradient(135deg, #1a3a5c 0%, #2d5a7b 25%, #407a9a 50%, #5a9ab8 75%, #7ab8d4 100%)', dark: 'linear-gradient(135deg, #0d1d2e 0%, #152d40 25%, #1d3d52 50%, #254d64 75%, #2d5d76 100%)' },
  { id: 'plum-blossom', nameKey: 'settings.bgPresetPlumBlossom', category: 'nature', light: 'linear-gradient(135deg, #f5e6e8 0%, #e8c8cc 30%, #d4a0a8 60%, #c07888 100%)', dark: 'linear-gradient(135deg, #2a1a1e 0%, #302025 30%, #382830 60%, #403038 100%)' },
  { id: 'autumn-maple', nameKey: 'settings.bgPresetAutumnMaple', category: 'nature', light: 'linear-gradient(135deg, #d4a574 0%, #c89060 25%, #b87a4a 50%, #a86838 75%, #8a5030 100%)', dark: 'linear-gradient(135deg, #3a2a18 0%, #3d2515 25%, #402012 50%, #431b0f 75%, #46160c 100%)' },
  { id: 'minimal-silk', nameKey: 'settings.bgPresetSilk', category: 'minimal', light: 'linear-gradient(180deg, #faf8f5 0%, #f0ece5 50%, #e8e2d8 100%)', dark: 'linear-gradient(180deg, #1c1a17 0%, #222019 50%, #28261e 100%)' },
  { id: 'minimal-bamboo', nameKey: 'settings.bgPresetBamboo', category: 'minimal', light: 'linear-gradient(160deg, #f0f4f0 0%, #dce6dc 40%, #c8d8ca 70%, #b4c8b8 100%)', dark: 'linear-gradient(160deg, #1a1e1a 0%, #1e2420 40%, #222a24 70%, #263028 100%)' },
  { id: 'minimal-stone', nameKey: 'settings.bgPresetStone', category: 'minimal', light: 'linear-gradient(135deg, #4a4a4a 0%, #5a5a5a 30%, #6a6a6a 60%, #7a7a7a 100%)', dark: 'linear-gradient(135deg, #1a1a1a 0%, #222 30%, #2a2a2a 60%, #323232 100%)' },
]

export function getSolidColor(presetId: string, isDark: boolean): string | null {
  const preset = solidPresets.find(p => p.id === presetId)
  return preset ? (isDark ? preset.dark : preset.light) : null
}

export function getGradientCSS(gradientId: string, isDark: boolean): string | null {
  const preset = gradientPresets.find(p => p.id === gradientId)
  return preset ? (isDark ? preset.dark : preset.light) : null
}
