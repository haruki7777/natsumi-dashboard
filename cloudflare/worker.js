const DEFAULT_ORIGIN = 'http://45.13.236.245:25901';

function rewriteLocation(location, publicOrigin, origin) {
  if (!location) return location;
  try {
    const url = new URL(location);
    if (url.origin === origin.origin) {
      url.protocol = publicOrigin.protocol;
      url.host = publicOrigin.host;
      return url.toString();
    }
  } catch {}
  return location;
}

export default {
  async fetch(request, env) {
    const publicUrl = new URL(request.url);
    const origin = new URL(env.ORIGIN_URL || DEFAULT_ORIGIN);
    const targetUrl = new URL(request.url);

    targetUrl.protocol = origin.protocol;
    targetUrl.hostname = origin.hostname;
    targetUrl.port = origin.port;

    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-Proto', 'https');
    headers.set('X-Forwarded-Host', publicUrl.host);
    headers.set('X-Forwarded-Port', '443');
    headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');
    headers.delete('Accept-Encoding');

    const proxyRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
    });

    const response = await fetch(proxyRequest);
    const responseHeaders = new Headers(response.headers);

    const location = responseHeaders.get('Location');
    if (location) {
      responseHeaders.set('Location', rewriteLocation(location, publicUrl, origin));
    }

    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
