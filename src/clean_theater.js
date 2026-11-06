// Clean TV Theater Mode for DMAX and TLC live web streams
(() => {
  const url = window.location.href;
  if (!url.includes('dmax.com.tr') && !url.includes('tlctv.com.tr')) return;

  const styleEl = document.createElement('style');
  styleEl.id = 'mytv-clean-theater-styles';
  styleEl.textContent = `
    /* Hide everything: headers, footers, sidebars, cookie banners, recommendations */
    header, footer, nav,
    .header, .footer, .navbar, .top-bar,
    .columns > .column:not(:first-child),
    .video-meta, .timeline, .schedule, .stream-schedule,
    .related-videos, .recommendations, .suggested-videos,
    .cookie-policy, .cookie-banner, .onetrust-banner, #onetrust-consent-sdk,
    .banner, .ad-banner, .social-share, .comments {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      height: 0 !important;
      pointer-events: none !important;
    }

    /* Force video player container to fill 100% of the screen */
    html, body {
      background: #000000 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      width: 100vw !important;
      height: 100vh !important;
    }

    .video, .videp-player-container, #live-video-player, video {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      max-width: 100vw !important;
      max-height: 100vh !important;
      z-index: 99999999 !important;
      background: #000000 !important;
      margin: 0 !important;
      padding: 0 !important;
      object-fit: contain !important;
    }
  `;
  (document.head || document.documentElement).appendChild(styleEl);

  // Auto-accept/close any cookie prompts and trigger play
  function autoStartStream() {
    const playBtn = document.querySelector('.vjs-big-play-button, button.play, .play-button');
    if (playBtn) playBtn.click();

    const video = document.querySelector('video');
    if (video && video.paused) {
      video.play().catch(() => {});
    }
  }

  setInterval(autoStartStream, 1500);
})();
