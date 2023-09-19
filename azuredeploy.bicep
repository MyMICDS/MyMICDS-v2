// param location string = resourceGroup().location
param location string = 'westus3'

@description('Resource name prefix')
param resourceNamePrefix string
var envResourceNamePrefix = toLower(resourceNamePrefix)

@description('Docker image for API backend')
param backendImage string = 'ghcr.io/mymicds/mymicds-v2:latest'

@secure()
param emailUri string

@secure()
param jwtSecret string

@secure()
param openWeatherApiKey string

@secure()
param portalDayRotation string

@secure()
param googleServiceAccount string

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
 * Create Key Vault. This is where we store our secrets.
 */

resource keyVault 'Microsoft.KeyVault/vaults@2019-09-01' = {
	name: '${envResourceNamePrefix}keyvault'
	location: location
	properties: {
		enabledForTemplateDeployment: true
		tenantId: tenant().tenantId
		accessPolicies: []
		sku: {
			name: 'standard'
			family: 'A'
		}
	}
}

resource keyVaultSecretEmailUri 'Microsoft.KeyVault/vaults/secrets@2019-09-01' = {
	parent: keyVault
	name: 'emailUri'
	properties: {
		value: emailUri
	}
}

resource keyVaultSecretMongodbUri 'Microsoft.KeyVault/vaults/secrets@2019-09-01' = {
	parent: keyVault
	name: 'mongodbUri'
	properties: {
		value: dbAccount.listConnectionStrings().connectionStrings[0].connectionString
	}
}

resource keyVaultSecretJwtSecret 'Microsoft.KeyVault/vaults/secrets@2019-09-01' = {
	parent: keyVault
	name: 'jwtSecret'
	properties: {
		value: jwtSecret
	}
}

resource keyVaultSecretOpenWeatherApiKey 'Microsoft.KeyVault/vaults/secrets@2019-09-01' = {
	parent: keyVault
	name: 'openWeatherApiKey'
	properties: {
		value: openWeatherApiKey
	}
}

resource keyVaultSecretPortalDayRotation 'Microsoft.KeyVault/vaults/secrets@2019-09-01' = {
	parent: keyVault
	name: 'portalDayRotation'
	properties: {
		value: portalDayRotation
	}
}

resource keyVaultSecretGoogleServiceAccount 'Microsoft.KeyVault/vaults/secrets@2019-09-01' = {
	parent: keyVault
	name: 'googleServiceAccount'
	properties: {
		value: googleServiceAccount
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
			linuxFxVersion: 'Docker|${backendImage}'
			appSettings: [
				{
					name: 'AzureWebJobsStorage'
					value: azStorageConnectionString
				}
				{
					name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
					value: appInsights.properties.ConnectionString
				}
				{
					name: 'PORT'
					value: '80'
				}
				{
					name: 'HOSTED_ON'
					value: 'https://api.mymicds.net/v3'
				}
				{
					name: 'IS_PRODUCTION'
					value: 'true'
				}
			]

		}

	}
}

output functionAppName string = azfunctionapp.name
