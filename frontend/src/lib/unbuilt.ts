/** True when running inside the Omniflow embedded preview iframe. */
export const IS_EMBEDDED = typeof window !== 'undefined' && window.self !== window.top;

/** Notify the parent Omniflow shell that a not-yet-built feature was requested. */
export function requestBuild(feature: string, prompt: string) {
  if (typeof window === 'undefined' || window.self === window.top) return;
  window.parent.postMessage({ type: 'OMNIFLOW_BUILD_FEATURE', feature, prompt }, '*');
}
