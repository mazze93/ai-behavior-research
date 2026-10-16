/** Cache only public presentation assets; evidence, HTML and credentials stay no-store. */
export function responsePolicy(req:Request,response:Response):Response{
 const r=new Response(response.body,response),url=new URL(req.url),path=url.pathname;
 const font=/^\/fonts\/(Basteleur-(Bold|Moonlight)|BodoniModa-Latin|Manrope-Latin)\.woff2$/.test(path);
 const landing=/^\/_astro\/(?:[A-Za-z0-9_.-]+\.(js|css)|fonts\/[a-f0-9]+\.woff2)$/.test(path);
 const asset=font||landing||/^\/[a-z][a-z0-9-]*\.(css|js)$/.test(path)||/^\/explorers\/rel_[a-f0-9-]+\/(explorer\.(css|js)|contrasts\.svg)$/.test(path);
 const cacheable=asset&&['GET','HEAD'].includes(req.method)&&r.status===200&&!req.headers.has('Authorization')&&!req.headers.has('Cookie')&&!r.headers.has('Set-Cookie');
 r.headers.set('Cache-Control',cacheable?'public, max-age=300':'no-store');
 r.headers.set('X-Content-Type-Options','nosniff');
 r.headers.set('Referrer-Policy','no-referrer');
 r.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 r.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');
 if(url.protocol==='https:')r.headers.set('Strict-Transport-Security','max-age=31536000');
 let decoded=path;try{decoded=decodeURIComponent(path).replace(/\/+/g,'/');}catch{/* malformed paths already fail routing */}
 if(r.status>=400||decoded.startsWith('/api/')||['/console.html','/review.html','/persona.html'].includes(decoded.replace(/\/$/,'')))r.headers.set('X-Robots-Tag','noindex, nofollow');
 return r;
}
