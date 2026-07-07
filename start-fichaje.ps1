# Fichaje App - Script de arranque
# Ejecutar como Administrador (lo hace Task Scheduler con RunLevel Highest)

$ports = @(3000, 8001)
$composeFile  = '/mnt/c/David/02_proyectos/P15 Apps personales/App_1_Fichaje/01_Codigo/docker-compose.yml'
$projectDir   = '/mnt/c/David/02_proyectos/P15 Apps personales/App_1_Fichaje/01_Codigo'

Write-Host "[Fichaje] Arrancando contenedores Docker..." -ForegroundColor Cyan
wsl -e bash -c "docker compose -f '$composeFile' --project-directory '$projectDir' up -d 2>&1"

# Obtener IP actual de WSL2
$wslIp = (wsl -e bash -c "ip addr show eth0 | grep 'inet ' | grep -oP '(?<=inet )[^/]+'" 2>&1).Trim()
Write-Host "[Fichaje] WSL2 IP: $wslIp" -ForegroundColor Cyan

if (-not $wslIp) {
    Write-Host "[Fichaje] ERROR: No se pudo obtener la IP de WSL2" -ForegroundColor Red
    exit 1
}

# Actualizar portproxy IPv4 con la IP actual de WSL2
foreach ($port in $ports) {
    netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$port 2>$null
    netsh interface portproxy add    v4tov4 listenaddress=0.0.0.0 listenport=$port connectaddress=$wslIp connectport=$port
    # Proxy IPv6 loopback → IPv4 (para que localhost funcione en navegadores modernos)
    netsh interface portproxy delete v6tov4 listenaddress=::1 listenport=$port 2>$null
    netsh interface portproxy add    v6tov4 listenaddress=::1 listenport=$port connectaddress=127.0.0.1 connectport=$port
}

# Asegurar reglas de firewall (idempotente)
$fwRules = @{
    "WSL2 - Fichaje Frontend (3000)" = 3000
    "WSL2 - Fichaje Backend (8001)"  = 8001
}
foreach ($name in $fwRules.Keys) {
    if (-not (Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $name -Direction Inbound -Action Allow -Protocol TCP `
            -LocalPort $fwRules[$name] -Profile Any | Out-Null
        Write-Host "[Fichaje] Regla firewall creada: $name" -ForegroundColor Green
    }
}

Write-Host "[Fichaje] Listo." -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000"
Write-Host "  Backend:  http://localhost:8001"
Write-Host "  Swagger:  http://localhost:8001/docs"
