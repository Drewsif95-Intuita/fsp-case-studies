# Build, test and package the case hub; with -Upload, send the package to the FSP site.
param([switch]$Upload, [switch]$AllowDirty)
$ErrorActionPreference = "Stop"
$siteRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $siteRoot
. (Join-Path $PSScriptRoot "azure-cli.ps1")
$target = Get-Content -LiteralPath "deployment/target.json" -Raw | ConvertFrom-Json
function Assert-Exit { if ($LASTEXITCODE -ne 0) { throw "Command failed (exit $LASTEXITCODE)." } }

# What is uploaded must be committed here and in the case framework, so the live site can be traced
# and rolled back. The framework is checked after packaging, where package.py records its commit.
if ($Upload -and -not $AllowDirty -and (git -C $siteRoot status --porcelain)) {
  throw "Commit your changes before uploading, so the release is on record (or pass -AllowDirty)."
}

npm.cmd run build:hosted
Assert-Exit
$venv = Join-Path $siteRoot ".venv/Scripts/python.exe"
if (-not (Test-Path -LiteralPath $venv)) {
  throw "Create the server environment first: python -m venv .venv; .venv/Scripts/python.exe -m pip install -r requirements-dev.txt"
}
& $venv -m unittest discover -s server/tests -t .
Assert-Exit
# The framework's own Python (python-pptx, PyYAML) exports the catalogue and checks each deck.
python scripts/package.py
Assert-Exit
$package = Get-Content -LiteralPath "artifacts/package-report.json" -Raw | ConvertFrom-Json
if ($Upload -and -not $AllowDirty -and $package.version.framework.dirty) {
  throw "The case framework has uncommitted cases, scripts, templates or config. Commit them there before uploading (or pass -AllowDirty)."
}
if (-not $Upload) { Write-Output "Package prepared only. Use -Upload after deployment authorisation."; return }

$account = Invoke-ProjectAz account show --output json | ConvertFrom-Json
Assert-Exit
if ($account.id -ne $target.subscriptionId -or $account.tenantId -ne $target.tenantId) { throw "Azure account does not match deployment/target.json." }
if (-not $target.publicOrigin) { throw "Run scripts/provision.ps1 -Apply first, so the real address is recorded." }
$live = Invoke-ProjectAz webapp show --name $target.webAppName --resource-group $target.resourceGroup --subscription $target.subscriptionId --output json | ConvertFrom-Json
Assert-Exit
$liveProperties = if ($live.properties) { $live.properties } else { $live }
if ($liveProperties.serverFarmId -ine $target.existingPlanId) { throw "The app is not on the approved shared plan." }
if (("https://" + $liveProperties.defaultHostName) -ine $target.publicOrigin) { throw "The live hostname does not match the recorded origin." }
$settings = Invoke-ProjectAz webapp config appsettings list --name $target.webAppName --resource-group $target.resourceGroup --subscription $target.subscriptionId --output json | ConvertFrom-Json
Assert-Exit
$settingsMap = @{}
foreach ($setting in $settings) { $settingsMap[$setting.name] = $setting.value }
if ($settingsMap["TENANT_ID"] -ne $target.tenantId) { throw "The runtime tenant does not match the FSP tenant." }
if ($settingsMap["CLIENT_ID"] -ine $target.entraClientId -or $settingsMap["PUBLIC_ORIGIN"] -ine $target.publicOrigin) {
  throw "Set the recorded client ID and origin through scripts/provision.ps1 -Apply before uploading."
}
if ($settingsMap["SCM_DO_BUILD_DURING_DEPLOYMENT"] -ne "true" -or $settingsMap["ENABLE_ORYX_BUILD"] -ne "true") { throw "The reviewed Oryx build settings are not active." }

Invoke-ProjectAz webapp deploy --name $target.webAppName --resource-group $target.resourceGroup --subscription $target.subscriptionId --src-path "artifacts/fsp-case-study-hub.zip" --type zip --restart true --output table
if ($LASTEXITCODE -ne 0) {
  throw "Azure CLI did not confirm completion. A gateway timeout can leave the build running on Azure: check az webapp log deployment list for this app and /healthz before retrying. Exit: $LASTEXITCODE"
}
Write-Output ("Uploaded to " + $target.publicOrigin + ". Run python scripts/smoke_live.py, then sign in with an FSP account.")
