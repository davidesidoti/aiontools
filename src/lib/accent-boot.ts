// src/lib/accent-boot.ts
// Inlined in <head>: applies the stored faction accent before first paint, so Asmodian users don't see a gold flash.
// Only the known value is applied; anything else (or unreadable storage) leaves the default.
export const ACCENT_BOOT =
  'try{var a=JSON.parse(localStorage.getItem("aiontools:user-data")||"{}");a=a&&a.settings&&a.settings.accent;if(a==="asmodian")document.documentElement.dataset.accent=a}catch(e){}';
