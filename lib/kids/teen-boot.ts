// lib/kids/teen-boot.ts — server-safe constants for the teen "R2BOT Lab" look
// (roadmap #83). No React: app/kids/layout.tsx (a server component) imports
// KIDS_LOOK_BOOT_SCRIPT from here, the same way it imports the settings boot script.
//
// The look is decided by the playing child's band (Engineers, 14–17 → "lab") and
// an optional per-child preference ("lab" / "kids"). It is written to <html> as
//   data-kids-band="explorers|builders|inventors|engineers|none"
//   data-kids-look="lab|kids"
// before first paint, so the header never flashes the "Kids" wordmark at a teen.
// CSS: app/kids/kids-teen.css. Runtime: lib/kids/teen.ts + KidsLookSyncClient.

export const KIDS_LOOK_EVENT = 'r2bot:kids-look'
/** Per child: stored under profileKey(KIDS_LOOK_KEY) (lib/kids/profiles.ts). */
export const KIDS_LOOK_KEY = 'r2bot_kids_look_v1'
export const KIDS_BAND_ATTR = 'data-kids-band'
export const KIDS_LOOK_ATTR = 'data-kids-look'

/** Same keys as lib/kids-progress.ts (KEY) and lib/kids/profiles.ts (PROFILES_KEY, 'p1', '::', '_none'). */
const PROGRESS_KEY = 'r2bot_kids_v2'
const PROFILES_KEY = 'r2bot_kids_profiles_v1'

/**
 * Inline script for app/kids/layout.tsx. Resolves the active profile exactly as
 * profileKey() does (no stored profiles = the original child 'p1' with plain keys),
 * reads that child's band and look preference, and sets the two <html> attributes.
 */
export const KIDS_LOOK_BOOT_SCRIPT = `(function(){try{var L=localStorage,a='p1',r=L.getItem(${JSON.stringify(PROFILES_KEY)});if(r){var s=JSON.parse(r)||{};var ok=typeof s.active==='string'&&Array.isArray(s.profiles)&&s.profiles.some(function(p){return p&&p.id===s.active});a=ok?s.active:null;}var k=function(b){return a==='p1'?b:b+'::'+(a||'_none')};var p=JSON.parse(L.getItem(k(${JSON.stringify(PROGRESS_KEY)}))||'{}')||{};var b=['explorers','builders','inventors','engineers'].indexOf(p.band)>=0?p.band:'none';var f=L.getItem(k(${JSON.stringify(KIDS_LOOK_KEY)}));var l=f==='lab'||f==='kids'?f:(b==='engineers'?'lab':'kids');var h=document.documentElement;h.setAttribute(${JSON.stringify(KIDS_BAND_ATTR)},b);h.setAttribute(${JSON.stringify(KIDS_LOOK_ATTR)},l);}catch(e){}})();`
