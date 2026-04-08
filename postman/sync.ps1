# postman/sync.ps1
# Syncs the local Postman collection and environment files to Postman Cloud.
# Usage: .\postman\sync.ps1

$collectionUid = "52089271-c4a6ee3f-3818-44fb-94d9-2266b6ce394c"
$envUid        = "52089271-4bca42f0-ec21-451f-911f-6dc85836da86"

$envContent = Get-Content ".env" -ErrorAction SilentlyContinue
if (-not $envContent) {
    Write-Host "ERROR: .env file not found in project root." -ForegroundColor Red
    exit 1
}

$envVars = @{}
foreach ($line in $envContent) {
    if ($line -match '^\s*([^#][^=]*?)\s*=\s*(.*)\s*$') {
        $envVars[$matches[1].Trim()] = $matches[2].Trim()
    }
}

$apiKey = $envVars["POSTMAN_API_KEY"]

if (-not $apiKey -or $apiKey -eq "your_postman_api_key_here") {
    Write-Host "ERROR: POSTMAN_API_KEY is missing or not set in .env" -ForegroundColor Red
    exit 1
}

$headers = @{
    "X-Api-Key"    = $apiKey
    "Content-Type" = "application/json"
}

# ── Sync Collection ────────────────────────────────────────────
Write-Host "Syncing collection..." -ForegroundColor Cyan
$collectionJson = Get-Content "postman/Learnova_Backend.postman_collection.json" -Raw | ConvertFrom-Json
$colBody = @{ collection = $collectionJson } | ConvertTo-Json -Depth 100

try {
    $colResponse = Invoke-RestMethod `
        -Uri "https://api.getpostman.com/collections/$collectionUid" `
        -Method PUT `
        -Headers $headers `
        -Body $colBody
    Write-Host "Collection synced: $($colResponse.collection.name)" -ForegroundColor Green
} catch {
    Write-Host "ERROR syncing collection: $_" -ForegroundColor Red
    exit 1
}

# ── Sync Environment ───────────────────────────────────────────
Write-Host "Syncing environment..." -ForegroundColor Cyan
$envJson = Get-Content "postman/Learnova_Local.postman_environment.json" -Raw | ConvertFrom-Json
$envBody = @{ environment = $envJson } | ConvertTo-Json -Depth 100

try {
    $envResponse = Invoke-RestMethod `
        -Uri "https://api.getpostman.com/environments/$envUid" `
        -Method PUT `
        -Headers $headers `
        -Body $envBody
    Write-Host "Environment synced: $($envResponse.environment.name)" -ForegroundColor Green
} catch {
    Write-Host "ERROR syncing environment: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Postman synced successfully!" -ForegroundColor Green
