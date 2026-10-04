/**
 * Tailwind (CDN) theme extension — the school's brand tokens.
 *
 * Loaded immediately after the Tailwind CDN script in index.html, which is the
 * order the play CDN expects: it defines `window.tailwind`, then rebuilds when
 * `tailwind.config` is assigned. Keeping the palette, fonts and shadows here
 * means a brand change is a single-file edit.
 */

window.tailwind = window.tailwind || {};

window.tailwind.config = {
darkMode: 'class',
theme: {
  extend: {
    colors: {
      brand: {
        blue: '#0E3A75',
        darkBlue: '#09254D',
        lightBlue: '#1E40AF',
        gold: '#E5A823',
        goldHover: '#D49712',
        goldLight: '#FEF3C7',
        bgLight: '#F8FAFC',
        textDark: '#0F172A',
        accent: '#2563EB'
      }
    },
    fontFamily: {
      sans: ['Inter', 'Cairo', 'sans-serif'],
      display: ['"Playfair Display"', '"Cormorant Garamond"', 'Georgia', 'serif'],
      serif: ['"Playfair Display"', '"Cormorant Garamond"', 'Georgia', 'serif'],
      arabic: ['Cairo', 'sans-serif']
    },
    boxShadow: {
      glow: '0 10px 30px -10px rgba(229, 168, 35, 0.3)',
      header: '0 4px 20px -2px rgba(14, 58, 117, 0.08)',
      card: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
      cardHover: '0 20px 35px -10px rgba(14, 58, 117, 0.15)'
    }
  }
}
};
