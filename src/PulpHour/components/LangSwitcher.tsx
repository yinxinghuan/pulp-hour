// Tiny language switcher chip — sits next to the AlterU watermark.
// Tapping opens an inline row of locale stamps; tapping one swaps locale,
// persists to localStorage, and notifies subscribers via a custom event.

import { useEffect, useState } from 'react';
import { LOCALES, LOCALE_LABELS, locale, setLocale, type Locale } from '../i18n';

export default function LangSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Locale>(locale());

  useEffect(() => {
    function onChange(e: Event) {
      const detail = (e as CustomEvent).detail as Locale;
      setCurrent(detail);
    }
    window.addEventListener('ph-locale', onChange);
    return () => window.removeEventListener('ph-locale', onChange);
  }, []);

  function choose(l: Locale) {
    setLocale(l);
    setCurrent(l);
    setOpen(false);
  }

  return (
    <div className="ph-lang" data-no-feedback>
      {open && (
        <div className="ph-lang__sheet">
          {LOCALES.map(l => (
            <button
              key={l}
              className={`ph-lang__opt ${l === current ? 'ph-lang__opt--on' : ''}`}
              onPointerDown={() => choose(l)}
            >
              {LOCALE_LABELS[l]}
            </button>
          ))}
        </div>
      )}
      <button
        className="ph-lang__chip"
        onPointerDown={() => setOpen(o => !o)}
        aria-label="language"
      >
        {LOCALE_LABELS[current]}
      </button>
    </div>
  );
}
