# Append the case hub's two sign-in addresses to the shared Data Product - Internal Apps registration.
#
# That registration also signs people in to the Data Products handbook and Skills Matrix, so this
# changes one property and nothing else: it appends to spa.redirectUris and keeps every existing
# address. It never touches scopes, API identifiers, claims, credentials, owners or permissions,
# and it checks afterwards that none of them moved. Without -Apply it only shows the change.
param([switch]$Apply)
$ErrorActionPreference = "Stop"
$siteRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $siteRoot
. (Join-Path $PSScriptRoot "azure-cli.ps1")
$target = Get-Content -LiteralPath "deployment/target.json" -Raw | ConvertFrom-Json
function Assert-Exit { if ($LASTEXITCODE -ne 0) { throw "Command failed (exit $LASTEXITCODE)." } }
function Save-Json($name, $value) {
  [IO.File]::WriteAllText((Join-Path $siteRoot "artifacts/$name"), ($value | ConvertTo-Json -Depth 30), (New-Object System.Text.UTF8Encoding($false)))
}

$account = Invoke-ProjectAz account show --output json | ConvertFrom-Json
Assert-Exit
if ($account.tenantId -ne $target.tenantId) { throw "Signed in to the wrong tenant." }
if (-not $target.publicOrigin) { throw "Run scripts/provision.ps1 -Apply first, so the site's real address is recorded." }

$wanted = @(($target.publicOrigin + "/auth/complete"), ($target.publicOrigin + "/auth/bridge"))
$application = "https://graph.microsoft.com/v1.0/applications/" + $target.entraObjectId
$read = $application + '?$select=id,appId,displayName,spa,web,publicClient,identifierUris,api,optionalClaims,requiredResourceAccess'
[IO.Directory]::CreateDirectory((Join-Path $siteRoot "artifacts")) | Out-Null

$before = Invoke-ProjectAz rest --method get --url $read --output json | ConvertFrom-Json
Assert-Exit
if ($before.appId -ne $target.entraClientId) { throw "The registration at that object ID is not the shared client recorded in deployment/target.json." }
Save-Json "registration-before.json" $before

$current = @($before.spa.redirectUris)
$missing = @($wanted | Where-Object { $current -notcontains $_ })
Write-Output ("Registration: " + $before.displayName + " (" + $before.appId + ")")
Write-Output ("Existing SPA redirect addresses (" + $current.Count + "), all kept:")
$current | ForEach-Object { Write-Output ("  " + $_) }
if ($missing.Count -eq 0) { Write-Output "Both case hub addresses are already registered. Nothing to change."; return }
Write-Output "To append:"
$missing | ForEach-Object { Write-Output ("  + " + $_) }
if (-not $Apply) { Write-Output "Dry run only. -Apply appends these addresses and changes nothing else."; return }

Save-Json "registration-rollback.json" @{ spa = @{ redirectUris = $current } }
Save-Json "registration-patch.json" @{ spa = @{ redirectUris = @($current + $missing) } }
Invoke-ProjectAz rest --method patch --url $application --headers "Content-Type=application/json" --body ("@" + (Join-Path $siteRoot "artifacts/registration-patch.json"))
Assert-Exit

$after = Invoke-ProjectAz rest --method get --url $read --output json | ConvertFrom-Json
Assert-Exit
Save-Json "registration-after.json" $after
$afterUris = @($after.spa.redirectUris)
foreach ($uri in ($current + $wanted)) { if ($afterUris -notcontains $uri) { throw "Redirect address missing after the update: $uri. Restore with artifacts/registration-rollback.json." } }
foreach ($field in "web", "publicClient", "identifierUris", "api", "optionalClaims", "requiredResourceAccess", "displayName") {
  if (($before.$field | ConvertTo-Json -Depth 30 -Compress) -ne ($after.$field | ConvertTo-Json -Depth 30 -Compress)) {
    throw "Registration field '$field' changed unexpectedly. Review artifacts/registration-before.json and registration-after.json."
  }
}
Write-Output "Appended the case hub addresses. Every existing address and every other registration setting is unchanged."
