import { settingService } from '../services/index.js';
import { applyCmsText } from '../core/dom.js';

/**
 * About page. Its narrative copy is static by design; the statistics counters
 * come from the CMS so they can be updated without a code change.
 */
export default {
  async mount(root) {
    try {
      const { stats } = await settingService.getPublic();
      if (!stats) return;
      for (const element of root.querySelectorAll('[data-stat]')) {
        applyCmsText(element, stats[element.dataset.stat]);
      }
    } catch {
      // Falls back to the values already in the markup.
    }
  },
};
