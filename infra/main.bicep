targetScope = 'resourceGroup'

// Deploy into the existing resource group recorded in deployment/target.json, beside the FSP Data
// Products handbook. This template creates no resource group, hosting plan, identity or paid add-on.
@description('The approved App Service name.')
@allowed([
  'fsp-case-study-hub'
])
param environmentName string

@allowed([
  'uksouth'
])
param location string

param deployedBy string
param createdAt string

@description('The existing shared hosting plan. It is referenced, never deployed or resized.')
@allowed([
  '/subscriptions/d609115f-cddc-476c-89db-405004e7b68c/resourceGroups/fsp-dataproduct-dev-rg/providers/Microsoft.Web/serverfarms/ASP-fspdataproductdevrg-a4ba'
])
param existingAppServicePlanId string

@description('FSP tenant; all content authorization remains single-tenant.')
@allowed([
  '805d0794-f9ac-42a6-b40a-9e41418a213e'
])
param tenantId string

@description('The shared Data Product - Internal Apps client ID. Empty configuration fails closed.')
param clientId string = ''

@description('The HTTPS origin Azure assigns. Empty until known; protected content fails closed.')
param publicOrigin string = ''

var tags = {
  BusinessUnit: 'Data Product'
  Client: 'FSP'
  environment: environmentName
  'deployed-by': deployedBy
  'created-at': createdAt
}

module appService './modules/app-service.bicep' = {
  name: 'fsp-case-study-hub-webapp'
  params: {
    appServiceName: environmentName
    appServicePlanId: existingAppServicePlanId
    location: location
    tags: tags
    tenantId: tenantId
    clientId: clientId
    publicOrigin: publicOrigin
  }
}

output webAppName string = appService.outputs.webAppName
output webAppId string = appService.outputs.webAppId
output defaultHostName string = appService.outputs.defaultHostName
output websiteUrl string = appService.outputs.websiteUrl
