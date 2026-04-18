# PowerShell script to deploy CloudBase function
$env:CLOUDBASE_CLI_CONFIG_FILE = "cloudbase-config.json"

Write-Host "Starting deployment of generateReport function..."

# Run the command and capture output
$output = & tcb fn deploy generateReport --dir cloudfunctions/generateReport --force 2>&1

Write-Host "Deployment output:"
$output | ForEach-Object { Write-Host $_ }

Write-Host "Deployment completed."