// Google Analytics 4 (GA4) SPA Tracking Helper

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

export function initGA4(): void {
  if (typeof window === 'undefined') return;
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId || window.gtag) return;

  // Inject gtag.js
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });
}

export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;

  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle || document.title,
    send_to: measurementId,
  });
}

export function trackEvent(
  eventName:
    | 'cta_click'
    | 'test_published'
    | 'test_submitted'
    | 'ai_explanation_requested'
    | 'generate_lead',
  params?: Record<string, any>,
): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', eventName, params || {});
}
