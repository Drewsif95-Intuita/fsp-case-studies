targetScope = 'resourceGroup'

param location string
param tags object
param appServicePlanId string
param appServiceName string
param tenantId string
param clientId string
param publicOrigin string

// The same resource and settings as the FSP Data Products handbook's app on this plan.
// API and PYTHON|3.13 runtime as verified for the handbook on 2026-09-10.
resource appService 'Microsoft.Web/sites@2026-07-15' = {
  name: appServiceName
  location: location
  tags: tags
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlanId
    reserved: true
    httpsOnly: true
    publicNetworkAccess: 'Enabled'
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.13'
      appCommandLine: 'python -m uvicorn app:app --host 0.0.0.0 --port 8000'
      alwaysOn: true
      healthCheckPath: '/healthz'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      http20Enabled: true
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'ENABLE_ORYX_BUILD'
          value: 'true'
        }
        {
          name: 'TENANT_ID'
          value: tenantId
        }
        {
          name: 'CLIENT_ID'
          value: clientId
        }
        {
          name: 'PUBLIC_ORIGIN'
          value: publicOrigin
        }
      ]
    }
  }
}

// CLI ZIP deployment uses Microsoft Entra credentials, with basic credentials disabled.
resource scmAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2026-07-15' = {
  parent: appService
  name: 'scm'
  properties: {
    allow: false
  }
}

resource ftpAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2026-07-15' = {
  parent: appService
  name: 'ftp'
  properties: {
    allow: false
  }
}

// No EasyAuth: server/auth.py verifies every content access token, as the handbook's does.
// No secrets, managed identity, Key Vault, database or telemetry service are needed.
output webAppName string = appService.name
output webAppId string = appService.id
output defaultHostName string = appService.properties.defaultHostName
output websiteUrl string = 'https://${appService.properties.defaultHostName}'
