from django.http import HttpResponse, JsonResponse


def root(_request):
    """Backoffice Hub landing page for Admin and Employees."""
    html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JFP Backoffice Hub</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: { 50:'#fff7ed', 100:'#ffedd5', 500:'#f97316', 600:'#ea580c', 700:'#c2410c', 900:'#7c2d12' },
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen flex flex-col justify-between">

  <!-- Main Container -->
  <main class="flex-1 flex items-center justify-center p-4">
    <div class="w-full max-w-4xl">
      
      <!-- Brand Header -->
      <div class="text-center mb-10">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500 text-white text-2xl font-bold mb-4 shadow-lg shadow-brand-500/20">
          JFP
        </div>
        <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Jai Fancy Packs</h1>
        <p class="text-gray-400 text-sm sm:text-base mt-2">Backoffice Administration & Management Hub</p>
      </div>

      <!-- Core Choices Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- Admin Portal Card -->
        <div class="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex flex-col justify-between hover:border-brand-500/40 transition duration-300 shadow-xl">
          <div>
            <div class="w-12 h-12 bg-orange-950/60 border border-brand-500/30 rounded-xl flex items-center justify-center text-2xl mb-4">
              🛡️
            </div>
            <h2 class="text-xl font-bold text-white mb-2">Admin Portal</h2>
            <p class="text-gray-400 text-sm leading-relaxed mb-6">
              Access the operations control room to verify check-ins, generate payouts, and manage whitelists, or enter the database administrator directly.
            </p>
          </div>
          <div class="flex flex-col gap-2">
            <a href="/employee/admin-dashboard/" 
               class="w-full text-center bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition transform active:scale-95 shadow-md shadow-brand-500/10">
              Operations Dashboard &rarr;
            </a>
            <a href="/admin/" 
               class="w-full text-center bg-gray-800 hover:bg-gray-750 text-gray-300 font-semibold py-2.5 rounded-xl border border-gray-700 transition transform active:scale-95 text-xs">
              Django Database Admin
            </a>
          </div>
        </div>

        <!-- Employee Portal Card -->
        <div class="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex flex-col justify-between hover:border-green-500/40 transition duration-300 shadow-xl">
          <div>
            <div class="w-12 h-12 bg-green-950/60 border border-green-500/30 rounded-xl flex items-center justify-center text-2xl mb-4">
              👥
            </div>
            <h2 class="text-xl font-bold text-white mb-2">Employee Portal</h2>
            <p class="text-gray-400 text-sm leading-relaxed mb-6">
              Access your personal dashboard. Verify device fingerprint, punch in/out using live GPS coordinates and photo validation, and check your leave logs.
            </p>
          </div>
          <a href="/employee/" 
             class="w-full text-center bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition transform active:scale-95 shadow-md shadow-green-600/10">
            Employee Login &rarr;
          </a>
        </div>

      </div>

    </div>
  </main>

  <!-- Sticky Footer -->
  <footer class="bg-gray-900/60 border-t border-gray-800/80 py-6 px-4">
    <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
      <div class="text-gray-500 text-center sm:text-left">
        Jai Fancy Packs &bull; Backoffice System &copy; 2026
      </div>
      
      <!-- Footer Links -->
      <div class="flex items-center gap-6">
        <a href="/api/health/" 
           class="flex items-center gap-1.5 text-gray-400 hover:text-white transition font-medium">
          <span class="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          System Health
        </a>
        <a href="/api/products/" 
           class="text-gray-400 hover:text-white transition font-medium">
          📦 Product List API
        </a>
      </div>
    </div>
  </footer>

</body>
</html>"""
    return HttpResponse(html)


def health(_request):
    return JsonResponse({"status": "ok", "service": "jai-fancy-packs-api"})
