// lib/kids/settings-boot.ts — server-safe constants for the kids Settings store
// (lib/kids/settings.ts). No React here: app/kids/layout.tsx (a server component)
// imports KIDS_SETTINGS_BOOT_SCRIPT from this file.

export const KIDS_SETTINGS_EVENT = 'r2bot:kids-settings'
export const KIDS_SETTINGS_KEY = 'r2bot_kids_settings'
/** Same key as lib/kids-voice.ts — keep in step. */
export const KIDS_VOICE_KEY = 'r2bot_kids_voice'

export const KIDS_LARGE_TEXT_CLASS = 'kids-large-text'
export const KIDS_REDUCE_MOTION_CLASS = 'kids-reduce-motion'
export const KIDS_LITE_3D_CLASS = 'kids-lite-3d'

/**
 * Inline script for app/kids/layout.tsx (next to KIDS_APP_BOOT_SCRIPT): sets the
 * <html> classes before first paint so larger text never jumps in after hydration.
 */
export const KIDS_SETTINGS_BOOT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(KIDS_SETTINGS_KEY)})||'{}')||{};var c=document.documentElement.classList;if(s.largeText===true)c.add(${JSON.stringify(KIDS_LARGE_TEXT_CLASS)});if(s.reduceMotion===true)c.add(${JSON.stringify(KIDS_REDUCE_MOTION_CLASS)});if(s.lite3d===true)c.add(${JSON.stringify(KIDS_LITE_3D_CLASS)});}catch(e){}})();`
