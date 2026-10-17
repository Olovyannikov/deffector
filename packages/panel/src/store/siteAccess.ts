/** Where the panel is hosted, it may tell whether deffector is allowed to run on the inspected page. */
export interface SiteAccessStatus {
  origin: string;
  granted: boolean;
}

/**
 * Supplied by the browser extension: it runs on localhost by itself and on other sites only after
 * the user allows them. The standalone app has no such limit and leaves it out.
 */
export interface SiteAccess {
  /** null when the inspected page is not an http(s) page */
  check(): Promise<SiteAccessStatus | null>;
  /** asks the user to allow deffector on `origin` */
  request(origin: string): void;
}
