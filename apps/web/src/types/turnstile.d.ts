/** Minimal typings for the Cloudflare Turnstile browser API (explicit rendering). */
interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
  language?: string;
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string;
  reset(widgetId?: string): void;
}

interface Window {
  turnstile?: TurnstileApi;
}
