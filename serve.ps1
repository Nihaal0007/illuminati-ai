# Tiny static file server using HttpListener.
# Run: powershell -ExecutionPolicy Bypass -File serve.ps1
$port = 8001
$root = $PSScriptRoot
$prefix = "http://localhost:$port/"

Add-Type -AssemblyName System.Web

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Serving $root at $prefix  (Ctrl+C to stop)"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.ico'  = 'image/x-icon'
  '.woff' = 'font/woff'
  '.woff2'= 'font/woff2'
  '.txt'  = 'text/plain; charset=utf-8'
}

while ($listener.IsListening) {
  try { $ctx = $listener.GetContext() } catch { break }
  $req = $ctx.Request
  $res = $ctx.Response
  $rel = [System.Web.HttpUtility]::UrlDecode($req.Url.AbsolutePath).TrimStart('/')
  if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
  $path = Join-Path $root $rel
  if (Test-Path $path -PathType Container) { $path = Join-Path $path 'index.html' }

  if (Test-Path $path -PathType Leaf) {
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $ext = [System.IO.Path]::GetExtension($path).ToLower()
    $type = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
    $res.ContentType = $type
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $res.StatusCode = 404
    $msg = [Text.Encoding]::UTF8.GetBytes("404 Not Found: $rel")
    $res.OutputStream.Write($msg, 0, $msg.Length)
  }
  $res.OutputStream.Close()
}
