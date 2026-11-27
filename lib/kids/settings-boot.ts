// lib/kids/settings-boot.ts — server-safe constants for the kids Settings store
// (lib/kids/settings.ts). No React here: app/kids/layout.tsx (a server component)
// imports KIDS_SETTINGS_BOOT_SCRIPT from this file.

export const KIDS_SETTINGS_EVENT = 'r2bot:kids-settings'
export const KIDS_SETTINGS_KEY = 'r2bot_kids_settings'
/** Same key as lib/kids-voice.ts — keep in step. */
export const KIDS_VOICE_KEY = 'r2bot_kids_voice'

export const KIDS_LARGE_TEXT_CLASS = 'kids-large-text'
/** Added on top of KIDS_LARGE_TEXT_CLASS for the biggest text size. */
export const KIDS_LARGER_TEXT_CLASS = 'kids-larger-text'
export const KIDS_REDUCE_MOTION_CLASS = 'kids-reduce-motion'
export const KIDS_LITE_3D_CLASS = 'kids-lite-3d'
// Access + calm (roadmap #25 / #89). CSS: components/kids/settings/kids-settings.css.
export const KIDS_HIGH_CONTRAST_CLASS = 'kids-high-contrast'
export const KIDS_DYSLEXIA_CLASS = 'kids-dyslexia'
export const KIDS_COLOUR_SAFE_CLASS = 'kids-colour-safe'
export const KIDS_READ_ALOUD_CLASS = 'kids-read-aloud'
export const KIDS_CALM_CLASS = 'kids-calm'
export const KIDS_SCAN_CLASS = 'kids-scan'

/**
 * Inline script for app/kids/layout.tsx (next to KIDS_APP_BOOT_SCRIPT): sets the
 * <html> classes before first paint so larger text, high contrast or the
 * dyslexia-friendly font never jump in after hydration.
 */
export const KIDS_SETTINGS_BOOT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(KIDS_SETTINGS_KEY)})||'{}')||{};var c=document.documentElement.classList;var t=s.textSize==='large'||s.textSize==='larger'?s.textSize:(s.largeText===true?'large':'normal');if(t!=='normal')c.add(${JSON.stringify(KIDS_LARGE_TEXT_CLASS)});if(t==='larger')c.add(${JSON.stringify(KIDS_LARGER_TEXT_CLASS)});if(s.reduceMotion===true)c.add(${JSON.stringify(KIDS_REDUCE_MOTION_CLASS)});if(s.lite3d===true)c.add(${JSON.stringify(KIDS_LITE_3D_CLASS)});if(s.highContrast===true)c.add(${JSON.stringify(KIDS_HIGH_CONTRAST_CLASS)});if(s.dyslexia===true)c.add(${JSON.stringify(KIDS_DYSLEXIA_CLASS)});if(s.colourSafe===true)c.add(${JSON.stringify(KIDS_COLOUR_SAFE_CLASS)});if(s.readAloud===true)c.add(${JSON.stringify(KIDS_READ_ALOUD_CLASS)});if(s.calm===true)c.add(${JSON.stringify(KIDS_CALM_CLASS)});if(s.scanMode==='step'||s.scanMode==='auto')c.add(${JSON.stringify(KIDS_SCAN_CLASS)});}catch(e){}})();`
