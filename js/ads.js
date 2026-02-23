/* ==========================================================================
   100 Calculators — Ad Management
   AdSense / Mediavine integration layer
   ========================================================================== */

(function () {
  'use strict';

  // -----------------------------------------------------------------------
  // CONFIGURATION — Replace these values when you get your AdSense approval
  // -----------------------------------------------------------------------
  const AD_CONFIG = {
    // Set to true once AdSense is approved and the script tag is live
    adsEnabled: false,

    // Your AdSense publisher ID (format: ca-pub-XXXXXXXXXX)
    publisherId: 'ca-pub-XXXXXXXXXXXXXXXX',

    // Ad slot IDs — create these in your AdSense dashboard
    slots: {
      headerBanner:  'XXXXXXXXXX', // 728×90 leaderboard
      afterResult:   'XXXXXXXXXX', // 336×280 large rectangle
      inArticle:     'XXXXXXXXXX', // responsive in-article
      stickyFooter:  'XXXXXXXXXX', // 320×50 mobile anchor
    },
  };

  // -----------------------------------------------------------------------
  // Ad slot rendering
  // -----------------------------------------------------------------------

  function initAds() {
    if (!AD_CONFIG.adsEnabled) {
      // In development mode, show labeled placeholders
      document.querySelectorAll('.ad-slot').forEach(slot => {
        if (!slot.querySelector('.ad-placeholder-label')) {
          const label = document.createElement('div');
          label.className = 'ad-placeholder-label';
          label.textContent = 'Ad: ' + (slot.dataset.adFormat || slot.dataset.adPosition || 'Display');
          slot.appendChild(label);
        }
      });
      return;
    }

    // Push ad units once AdSense script is loaded
    document.querySelectorAll('.ad-slot ins.adsbygoogle').forEach(ad => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        // Ad blocked or failed to load — degrade gracefully
      }
    });
  }

  // -----------------------------------------------------------------------
  // Sticky footer ad (mobile only)
  // -----------------------------------------------------------------------

  function initStickyFooterAd() {
    const sticky = document.getElementById('ad-sticky-footer');
    if (!sticky) return;

    // Only show on mobile
    if (window.innerWidth > 768) {
      sticky.style.display = 'none';
      return;
    }

    // Show after 3 seconds of page engagement
    setTimeout(() => {
      sticky.classList.add('ad-sticky-visible');
    }, 3000);

    // Close button
    const closeBtn = sticky.querySelector('.ad-sticky-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        sticky.classList.remove('ad-sticky-visible');
        sticky.style.display = 'none';
      });
    }
  }

  // -----------------------------------------------------------------------
  // In-article ad injection
  // -----------------------------------------------------------------------

  function injectInArticleAd() {
    const article = document.querySelector('.article-content');
    if (!article) return;

    // Find the third <h2> in the article and inject an ad before it
    const headings = article.querySelectorAll('h2');
    if (headings.length >= 3) {
      const adSlot = document.createElement('div');
      adSlot.className = 'ad-slot ad-in-article';
      adSlot.dataset.adPosition = 'in-article';
      adSlot.dataset.adFormat = 'fluid';

      if (AD_CONFIG.adsEnabled) {
        adSlot.innerHTML = `
          <ins class="adsbygoogle"
               style="display:block; text-align:center"
               data-ad-layout="in-article"
               data-ad-format="fluid"
               data-ad-client="${AD_CONFIG.publisherId}"
               data-ad-slot="${AD_CONFIG.slots.inArticle}"></ins>`;
      }

      headings[2].parentNode.insertBefore(adSlot, headings[2]);
    }
  }

  // -----------------------------------------------------------------------
  // Initialize
  // -----------------------------------------------------------------------

  function init() {
    injectInArticleAd();
    initAds();
    initStickyFooterAd();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export config for external use
  window.AdConfig = AD_CONFIG;
})();
