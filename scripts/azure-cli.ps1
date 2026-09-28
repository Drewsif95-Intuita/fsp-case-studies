# Azure CLI wrapper: record each call in artifacts/deploy-audit.log and preserve the native exit code.
# Arguments are logged exactly as given, so never pass a secret through it.
$siteAuditPath = Join-Path (Split-Path -Parent $PSScriptRoot) "artifacts/deploy-audit.log"
function Invoke-ProjectAz {
  $siteAzArguments = @($args)
  $siteLabel = "az " + ($siteAzArguments -join " ")
  [IO.Directory]::CreateDirectory((Split-Path -Parent $siteAuditPath)) | Out-Null
  [IO.File]::AppendAllText($siteAuditPath, ([DateTime]::UtcNow.ToString("o") + " started " + $siteLabel + [Environment]::NewLine))
  & az @siteAzArguments
  $siteExit = $LASTEXITCODE
  [IO.File]::AppendAllText($siteAuditPath, ([DateTime]::UtcNow.ToString("o") + " exit=" + $siteExit + " " + $siteLabel + [Environment]::NewLine))
  $global:LASTEXITCODE = $siteExit
}
