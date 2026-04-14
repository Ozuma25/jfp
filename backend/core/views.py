from django.http import HttpResponse, JsonResponse


def root(_request):
    """Dev-friendly landing page. Use http:// not https:// with runserver."""
    html = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Jai Fancy Packs API</title></head>
<body style="font-family:system-ui,sans-serif;max-width:40rem;margin:2rem;">
<h1>Jai Fancy Packs — Django API</h1>
<p>If your browser says “invalid response”, you are probably using <strong>https://</strong>.
Use <strong>http://</strong> (plain HTTP) on port 8000.</p>
<ul>
<li><a href="/api/health/">/api/health/</a> — JSON health check</li>
<li><a href="/api/products/">/api/products/</a> — product list</li>
<li><a href="/admin/">/admin/</a> — Django admin</li>
</ul>
</body></html>"""
    return HttpResponse(html)


def health(_request):
    return JsonResponse({"status": "ok", "service": "jai-fancy-packs-api"})
