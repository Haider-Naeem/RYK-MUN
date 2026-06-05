export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'PUT, GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Upload-Secret',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    let path = url.pathname;
    if (path.startsWith('/')) path = path.slice(1);

    // Auth check
    const secret = request.headers.get('X-Upload-Secret');
    if (secret !== env.UPLOAD_SECRET) {
      return new Response('Unauthorized', { 
        status: 401,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Upload (PUT)
    if (request.method === 'PUT') {
      if (!path) {
        return new Response('Path required', { 
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }

      await env.BUCKET.put(path, request.body, {
        httpMetadata: {
          contentType: request.headers.get('Content-Type') || 'application/octet-stream',
        },
      });

      // Trim the env var to fix any spaces
      const publicUrl = (env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
      const fileUrl = `${publicUrl}/${path}`;

      return new Response(
        JSON.stringify({ url: fileUrl, key: path }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Serve file (GET/HEAD)
    if (request.method === 'GET' || request.method === 'HEAD') {
      const object = await env.BUCKET.get(path);
      if (!object) {
        return new Response('Not Found', { 
          status: 404,
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');

      return new Response(object.body, { headers });
    }

    return new Response('Method not allowed', { 
      status: 405,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  },
};