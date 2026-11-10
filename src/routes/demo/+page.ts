// Rendered per request, so the strict CSP arrives as a response header, as it does for
// any server-rendered page. Prerendered pages carry it in a meta tag instead.
export const prerender = false;
