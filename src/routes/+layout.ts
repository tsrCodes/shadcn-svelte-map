// Every page and endpoint is static, except routes that opt out on purpose
// (the CSP demo renders per request so its policy arrives as a header).
export const prerender = true;
