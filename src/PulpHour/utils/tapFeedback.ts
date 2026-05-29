// Global tap feedback — one capture-phase pointerdown listener fires a
// short pop + haptic on every <button>, [role=button], a[href] unless
// inside [data-no-feedback]. Audio is lazy-initialized on the first
// real interaction so we don't leak ambient state across the platform's
// preload window.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const C = (window.AudioContext || (window as any).webkitAudioContext) as
    | typeof AudioContext
    | undefined;
  if (!C) return null;
  try { ctx = new C(); } catch { return null; }
  return ctx;
}

function pop() {
  const c = getCtx();
  if (!c) return;
  try {
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(680, t);
    o.frequency.exponentialRampToValueAtTime(220, t + 0.07);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.09);
  } catch { /* ignore */ }
}

function haptic() {
  try { navigator.vibrate?.(6); } catch { /* ignore */ }
}

function isOptOut(el: Element | null): boolean {
  while (el) {
    if (el instanceof HTMLElement && el.dataset.noFeedback != null) return true;
    el = el.parentElement;
  }
  return false;
}

function isTappable(el: Element | null): boolean {
  while (el) {
    if (el instanceof HTMLElement) {
      const tag = el.tagName;
      if (tag === 'BUTTON') return true;
      if (tag === 'A' && (el as HTMLAnchorElement).href) return true;
      const role = el.getAttribute('role');
      if (role === 'button') return true;
    }
    el = el.parentElement;
  }
  return false;
}

let installed = false;
export function installTapFeedback() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener(
    'pointerdown',
    (e) => {
      const target = e.target as Element | null;
      if (!isTappable(target)) return;
      if (isOptOut(target)) return;
      pop();
      haptic();
    },
    { capture: true, passive: true },
  );
}
