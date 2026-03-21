Write-Host "🚀 Booting AERO Microservices + Dashboard in Background..." -ForegroundColor Green

# Use the script's own directory so relative paths always resolve correctly
$root = $PSScriptRoot
if (-not $root) { $root = Split-Path -Parent $MyInvocation.MyCommand.Path }

$services = @(
    @{ Name="Auth"; Dir="backend-services\auth-service"; Cmd="npm start" },
    @{ Name="Track"; Dir="backend-services\tracking-service"; Cmd="npm start" },
    @{ Name="Real"; Dir="backend-services\realtime-service"; Cmd="npm start" },
    @{ Name="Gate"; Dir="backend-services\api-gateway"; Cmd="npm start" },
    @{ Name="Dash"; Dir="dashboard"; Cmd="npm run dev" }
)

foreach ($s in $services) {
    Write-Host "Starting $($s.Name)..." -ForegroundColor Yellow
    Start-Job -Name $s.Name -ScriptBlock {
        param($path, $cmd)
        Set-Location $path
        Invoke-Expression $cmd
    } -ArgumentList "$root\$($s.Dir)", $s.Cmd | Out-Null
}
Write-Host ""
Write-Host "✅ All services starting in background!" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Access Links:" -ForegroundColor Green
Write-Host "  👉 Dashboard:        http://localhost:3000" -ForegroundColor White
Write-Host "  👉 API Gateway:     http://localhost:5010" -ForegroundColor White
Write-Host "  👉 Auth Service:    http://localhost:5001" -ForegroundColor Gray
Write-Host "  👉 Tracking:         http://localhost:5002" -ForegroundColor Gray
Write-Host ""
Write-Host "🔍 How to see output and errors:" -ForegroundColor Yellow
Write-Host "  To see logs of a service, run:" -ForegroundColor Gray
Write-Host "  Get-Job | Receive-Job -Keep"
Write-Host ""
Write-Host "  To stop all services, run:" -ForegroundColor Gray
Write-Host "  Get-Job | Stop-Job"
Write-Host ""
