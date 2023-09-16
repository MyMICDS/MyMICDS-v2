// param location string = resourceGroup().location
param location string = 'westus2'

@description('Resource name prefix')
param resourceNamePrefix string
var envResourceNamePrefix = toLower(resourceNamePrefix)

/**
 * Create database
 */

var dbAccountName = '${envResourceNamePrefix}mongodb'
var dbName = 'mymicds-prod'

resource dbAccount 'Microsoft.DocumentDb/databaseAccounts@2023-03-15-preview' = {
	kind: 'MongoDB'
	name: dbAccountName
	location: location
	properties: {
		databaseAccountOfferType: 'Standard'
		locations: [
			{
				failoverPriority: 0
				locationName: location
			}
		]
		backupPolicy: {
			type: 'Continuous'
			continuousModeProperties: {
				tier: 'Continuous7Days'
			}
		}
		isVirtualNetworkFilterEnabled: false
		virtualNetworkRules: []
		ipRules: []
		minimalTlsVersion: 'Tls12'
		enableMultipleWriteLocations: false
		capabilities: [
			{
				name: 'EnableMongo'
			}
			{
				name: 'DisableRateLimitingResponses'
			}
		]
		apiProperties: {
			serverVersion: '3.6'
		}
		enableFreeTier: true
		capacity: {
			totalThroughputLimit: 1000
		}
	}
}

resource database 'Microsoft.DocumentDB/databaseAccounts/mongodbDatabases@2022-05-15' = {
	parent: dbAccount
	name: dbName
	properties: {
		resource: {
			id: dbName
		}
		options: {
			autoscaleSettings: {
				maxThroughput: 1000
			}
		}
	}
}

resource aliasesCollection 'Microsoft.DocumentDb/databaseAccounts/mongodbDatabases/collections@2022-05-15' = {
	parent: database
	name: 'aliases'
	properties: {
		resource: {
			id: 'aliases'
			shardKey: {
				user_id: 'Hash'
			}
			indexes: [
				{
					key: {
						keys: [
							'_id'
						]
					}
				}
				{
					key: {
						keys: [
							'$**'
						]
					}
				}
				{
					key: {
						keys: [
							'user'
						]
					}
				}
				{
					key: {
						keys: [
							'user'
							'type'
							'classRemote'
						]
					}
				}
			]
		}
	}
}

resource usersCollection 'Microsoft.DocumentDb/databaseAccounts/mongodbDatabases/collections@2022-05-15' = {
	parent: database
	name: 'users'
	properties: {
		resource: {
			id: 'users'
			shardKey: {
				user_id: 'Hash'
			}
			indexes: [
				{
					key: {
						keys: [
							'_id'
						]
					}
				}
				{
					key: {
						keys: [
							'$**'
						]
					}
				}
				{
					key: {
						keys: [
							'user'
						]
					}
				}
				{
					key: {
						keys: [
							'confirmed'
						]
					}
				}
			]
		}
	}
}

/**
 * Create backend
 */

/* ###################################################################### */
// Create storage account for function app prereq
/* ###################################################################### */
resource azStorageAccount 'Microsoft.Storage/storageAccounts@2021-08-01' = {
	name: '${envResourceNamePrefix}storage'
	location: location
	kind: 'StorageV2'
	sku: {
		name: 'Standard_LRS'
	}
}
var azStorageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${azStorageAccount.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${azStorageAccount.listKeys().keys[0].value}'

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2021-06-01' = {
	name: '${envResourceNamePrefix}-loganalytics'
	location: location
	properties: any({
		retentionInDays: 30
		features: {
			searchVersion: 1
		}
		sku: {
			name: 'PerGB2018'
		}
	})
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
	name: '${envResourceNamePrefix}-ai'
	location: location
	kind: 'web'
	properties: {
		Application_Type: 'web'
		WorkspaceResourceId: logAnalyticsWorkspace.id
	}
}

resource environment 'Microsoft.App/managedEnvironments@2022-10-01' = {
	name: '${envResourceNamePrefix}-env'
	location: location
	properties: {
		daprAIInstrumentationKey: appInsights.properties.InstrumentationKey
		appLogsConfiguration: {
			destination: 'log-analytics'
			logAnalyticsConfiguration: {
				customerId: logAnalyticsWorkspace.properties.customerId
				sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
			}
		}
	}
}

resource azfunctionapp 'Microsoft.Web/sites@2022-09-01' = {
	name: '${envResourceNamePrefix}-funcapp'
	location: location
	kind: 'functionapp'
	properties: {
		managedEnvironmentId: environment.id
		siteConfig: {
			linuxFxVersion: 'Docker|mcr.microsoft.com/azure-functions/dotnet7-quickstart-demo:1.0'
			appSettings: [
				{
					name: 'AzureWebJobsStorage'
					value: azStorageConnectionString
				}
				{
					name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
					value: appInsights.properties.ConnectionString
				}
			]

		}

	}
}

output functionAppName string = azfunctionapp.name
