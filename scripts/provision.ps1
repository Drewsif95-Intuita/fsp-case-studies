# Create or update the case hub's web app on the existing shared plan. What-if by default; -Apply to change.
param([switch]$Apply)
$ErrorActionPreference = "Stop"
$siteRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $siteRoot
. (Join-Path $PSScriptRoot "azure-cli.ps1")
$target = Get-Content -LiteralPath "deployment/target.json" -Raw | ConvertFrom-Json
function Assert-Exit { if ($LASTEXITCODE -ne 0) { throw "Command failed (exit $LASTEXITCODE)." } }

$account = Invoke-ProjectAz account show --output json | ConvertFrom-Json
Assert-Exit
if ($account.id -ne $target.subscriptionId -or $account.tenantId -ne $target.tenantId) { throw "Wrong Azure subscription or tenant." }

# The plan is shared with the handbook, Skills Matrix and InternalCV and is never resized here.
$plan = Invoke-ProjectAz appservice plan show --ids $target.existingPlanId --output json | ConvertFrom-Json
Assert-Exit
$planProperties = if ($plan.properties) { $plan.properties } else { $plan }
if ($plan.sku.name -ne "B1" -or $plan.sku.capacity -ne 1 -or -not $planProperties.reserved -or $plan.location.Replace(" ", "").ToLower() -ne "uksouth") {
  throw "The shared plan no longer matches the reviewed Linux B1 / one instance / UK South plan. Review cost and capacity first."
}

$origin = if ($target.publicOrigin) { [string]$target.publicOrigin } else { [string]$target.expectedOrigin }
$createdAt = if ($target.PSObject.Properties["createdAt"] -and $target.createdAt) { [string]$target.createdAt } else { (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd") }
$parameters = Get-Content -LiteralPath "infra/main.parameters.json" -Raw | ConvertFrom-Json
$parameters.parameters.environmentName.value = [string]$target.webAppName
$parameters.parameters.clientId.value = [string]$target.entraClientId
$parameters.parameters.publicOrigin.value = $origin
$parameters.parameters.deployedBy.value = [string]$account.user.name
$parameters.parameters.createdAt.value = $createdAt
[IO.Directory]::CreateDirectory((Join-Path $siteRoot "artifacts")) | Out-Null
$parameterFile = Join-Path $siteRoot "artifacts/current.parameters.json"
[IO.File]::WriteAllText($parameterFile, ($parameters | ConvertTo-Json -Depth 20), (New-Object System.Text.UTF8Encoding($false)))
$common = @("--resource-group", $target.resourceGroup, "--subscription", $target.subscriptionId, "--template-file", "infra/main.bicep", "--parameters", ("@" + $parameterFile))

if (-not $Apply) {
  Invoke-ProjectAz deployment group what-if @common
  Assert-Exit
  Write-Output "Preview only. -Apply creates or updates only the fsp-case-study-hub web app."
  return
}

Invoke-ProjectAz deployment group create @common --name "fsp-case-study-hub" --output json | Set-Content -LiteralPath "artifacts/last-deployment.json" -Encoding UTF8
Assert-Exit
$deployment = Get-Content -LiteralPath "artifacts/last-deployment.json" -Raw | ConvertFrom-Json
$newOrigin = [string]$deployment.properties.outputs.websiteUrl.value
if (-not $newOrigin.StartsWith("https://")) { throw "Deployment did not return an HTTPS origin." }
if ($newOrigin -ine $origin) {
  throw "Azure assigned $newOrigin rather than $origin. Record it as publicOrigin in deployment/target.json and run -Apply again, so PUBLIC_ORIGIN matches, before registering redirect addresses."
}
$target.publicOrigin = $newOrigin
$target | Add-Member -NotePropertyName createdAt -NotePropertyValue $createdAt -Force
[IO.File]::WriteAllText((Join-Path $siteRoot "deployment/target.json"), ($target | ConvertTo-Json -Depth 10), (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("Provisioned " + $newOrigin + ". Case content stays blocked until the redirect addresses are registered and a package is uploaded.")
