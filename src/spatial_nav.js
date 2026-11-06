// TV Leanback Spatial Navigation for in-app web views (Netflix, YouTube, Spotify, etc.)
(() => {
  if (window.__mytv_spatial_nav_installed) return;
  window.__mytv_spatial_nav_installed = true;

  // Insert glowing TV focus indicator styles
  const styleEl = document.createElement('style');
  styleEl.id = 'mytv-tv-nav-styles';
  styleEl.textContent = `
    .mytv-tv-focused {
      outline: 4px solid #38bdf8 !important;
      outline-offset: 4px !important;
      box-shadow: 0 0 25px rgba(56, 189, 248, 0.8), 0 0 50px rgba(56, 189, 248, 0.4) !important;
      transform: scale(1.05) !important;
      transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease !important;
      z-index: 9999999 !important;
    }
  `;
  document.head ? document.head.appendChild(styleEl) : document.documentElement.appendChild(styleEl);

  let currentFocused = null;

  function setFocus(el) {
    if (currentFocused && currentFocused !== el) {
      currentFocused.classList.remove('mytv-tv-focused');
    }
    currentFocused = el;
    if (currentFocused) {
      currentFocused.classList.add('mytv-tv-focused');
      currentFocused.focus({ preventScroll: false });
      currentFocused.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }

  function getFocusableElements() {
    // Rich selector covering video tiles, cards, buttons, links, player controls
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      '[role="button"]',
      'ytd-rich-item-renderer',
      'ytd-video-renderer',
      'ytd-compact-video-renderer',
      'ytd-grid-video-renderer',
      '#video-title',
      '.title-card',
      '.slider-item',
      '[data-uia="play-button"]',
      '.playRing',
      '.tracklist-row',
      '[data-testid="tracklist-row"]',
      '[data-testid="card-click-handler"]',
      'input:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      'video'
    ];

    const elements = Array.from(document.querySelectorAll(selectors.join(',')));
    const visibleElements = [];

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const rect = el.getBoundingClientRect();
      // Must have visible dimensions
      if (rect.width < 25 || rect.height < 18) continue;
      // Must be within viewport or nearby
      if (rect.bottom < -300 || rect.top > window.innerHeight + 300) continue;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) continue;
      visibleElements.push(el);
    }

    return visibleElements;
  }

  function moveSpatial(direction) {
    const focusables = getFocusableElements();
    if (focusables.length === 0) return;

    // If nothing currently focused or outside DOM, pick most prominent visible element
    if (!currentFocused || !document.contains(currentFocused) || !currentFocused.classList.contains('mytv-tv-focused')) {
      // Find element closest to screen center or top-left
      let best = focusables[0];
      let bestDist = Infinity;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      focusables.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth) {
          const d = Math.hypot((r.left + r.right) / 2 - cx, (r.top + r.bottom) / 2 - cy);
          if (d < bestDist) {
            bestDist = d;
            best = el;
          }
        }
      });
      setFocus(best);
      return;
    }

    const currentRect = currentFocused.getBoundingClientRect();
    const curCx = (currentRect.left + currentRect.right) / 2;
    const curCy = (currentRect.top + currentRect.bottom) / 2;

    let bestCandidate = null;
    let minScore = Infinity;

    focusables.forEach(el => {
      if (el === currentFocused) return;
      const rect = el.getBoundingClientRect();
      const targetCx = (rect.left + rect.right) / 2;
      const targetCy = (rect.top + rect.bottom) / 2;

      const dx = targetCx - curCx;
      const dy = targetCy - curCy;

      let isCandidate = false;

      if (direction === 'ArrowRight' && dx > 15) {
        // Favor elements on same horizontal line
        const score = Math.abs(dx) + Math.abs(dy) * 2.2;
        if (score < minScore) { minScore = score; bestCandidate = el; }
      } else if (direction === 'ArrowLeft' && dx < -15) {
        const score = Math.abs(dx) + Math.abs(dy) * 2.2;
        if (score < minScore) { minScore = score; bestCandidate = el; }
      } else if (direction === 'ArrowDown' && dy > 15) {
        // Favor elements on same vertical column
        const score = Math.abs(dy) + Math.abs(dx) * 1.8;
        if (score < minScore) { minScore = score; bestCandidate = el; }
      } else if (direction === 'ArrowUp' && dy < -15) {
        const score = Math.abs(dy) + Math.abs(dx) * 1.8;
        if (score < minScore) { minScore = score; bestCandidate = el; }
      }
    });

    if (bestCandidate) {
      setFocus(bestCandidate);
    } else {
      // Fallback scroll if reached edge of viewport
      if (direction === 'ArrowDown') window.scrollBy({ top: 350, behavior: 'smooth' });
      else if (direction === 'ArrowUp') window.scrollBy({ top: -350, behavior: 'smooth' });
      else if (direction === 'ArrowRight') window.scrollBy({ left: 350, behavior: 'smooth' });
      else if (direction === 'ArrowLeft') window.scrollBy({ left: -350, behavior: 'smooth' });
    }
  }

  // Handle D-pad and Enter keys
  window.addEventListener('keydown', (e) => {
    // If user is typing in a search bar, let them type
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      if (['Escape'].includes(e.key)) {
        document.activeElement.blur();
      }
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      moveSpatial(e.key);
    } else if (e.key === 'Enter') {
      if (currentFocused) {
        e.preventDefault();
        e.stopPropagation();
        currentFocused.click();
      }
    }
  }, true);

  // If user moves mouse or clicks with air-mouse pointer, sync focus
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('a, button, [role="button"], ytd-rich-item-renderer, .title-card, [data-testid="tracklist-row"]');
    if (el && el !== currentFocused) {
      setFocus(el);
    }
  }, true);
})();
