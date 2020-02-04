/* eslint-disable max-params */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable unicorn/no-abusive-eslint-disable */
import Realm = require('realm')
import partial = require('lodash/partial');
import isEmpty = require('lodash/isEmpty');
import map = require('lodash/map');
import keys = require('lodash/keys');
// import isArray = require('lodash/isArray');
import isNil = require('lodash/isNil');
import toPairs = require('lodash/toPairs');
import assert = require('assert');
import rimraf = require('rimraf')

type Logger = (message?: string, ...args: any[]) => void;
function getRealmFilePath(sessionId: string): string {
  return `${process.cwd()}/temp-${sessionId}`
}

export enum TransactionMode {
  single = 'single',
  multiple = 'multiple'
}

async function openRealmWith(
  log: Logger,
  user: string,
  password: string,
  serverUrl: string,
  realmPath: string,
  schemaPath: string,
  sessionId: string
): Promise<Realm> {
  assert(!isEmpty(user), 'user name cant be undefined')
  assert(!isEmpty(password), 'password cant be undefined')
  assert(!isEmpty(serverUrl), 'server url cant be undefined')
  assert(!isEmpty(realmPath), 'realm path name cant be undefined')
  log('getting credentials')
  const creds = Realm.Sync.Credentials.usernamePassword(user, password, false)
  let currentUser

  currentUser = Realm.Sync.User.current

  const schemaMod = require(schemaPath)
  const schema = map(keys(schemaMod), key => schemaMod[key])
  log('schema', JSON.stringify(schema))
  if (!currentUser) {
    log('trying to log in')
    currentUser = await Realm.Sync.User.login(`https://${serverUrl}`, creds)
  }

  log('opening the realm at', `realms://${serverUrl}/${realmPath}`)
  const realmConfig = currentUser.createConfiguration({
    path: getRealmFilePath(sessionId) + '/temp-realm-file',
    sync: {
      url: `realms://${serverUrl}/${realmPath}`,
      error: (err: any) => log('error syncing relam', err),
      fullSynchronization: true,
      newRealmFileBehavior: {
        type: 'downloadBeforeOpen' as Realm.Sync.OpenRealmBehaviorType.DownloadBeforeOpen,
      },
      existingRealmFileBehavior: {
        type: 'downloadBeforeOpen' as Realm.Sync.OpenRealmBehaviorType.DownloadBeforeOpen,
      },
    },
    schema,
  })

  return Realm.open(realmConfig)
}

function getSchemaFor(
  realm: Realm,
  collectionName?: string
): Realm.ObjectSchema | undefined {
  return realm.schema.find(objSchema => objSchema.name === collectionName)
}

const defaultValues: Record<string, any> = {
  string: '',
  int: 0,
  bool: false,
  float: 0,
  double: 0,
  date: Date.now(),
  data: new ArrayBuffer(0),
}

function getPropertiesFrom(
  schema: Realm.ObjectSchema
): [string, Realm.ObjectSchemaProperty][] {
  return Reflect.ownKeys(schema.properties).map(propName => [
    propName.toString(),
    schema.properties[propName.toString()] as Realm.ObjectSchemaProperty,
  ])
}
function getObjectByPrimaryKeyOrTemplate(
  realm: Realm,
  schema: Realm.ObjectSchema,
  primaryKey: string
): Realm.Object {
  assert(!isNil(primaryKey), 'primary key can\'t be null')
  const obj = realm.objectForPrimaryKey(schema.name, primaryKey)
  if (!isNil(obj)) {
    return obj
  }
  const newObj: any = {}

  getPropertiesFrom(schema).forEach(([name, schemaProperty]) => {
    switch (schemaProperty.type) {
    case 'object':
    case 'list':
      break
    default:
      newObj[name] = schemaProperty.optional ?
        null :
        schemaProperty.default || defaultValues[schemaProperty.type]
    }
  })
  newObj[schema.primaryKey!] = primaryKey
  return realm.create(schema.name, newObj) as Realm.Object
}

function getOrCreateLinkingObjects(
  realm: Realm,
  propertyType: Realm.ObjectSchemaProperty,
  primaryKeyOrKeysOrValues: any | any[]
): any[] {
  const schema = getSchemaFor(realm, propertyType.objectType)
  assert(!isNil(schema), 'schema not found')

  const hasPrimaryKey = !isNil(schema?.primaryKey)
  if (!hasPrimaryKey) {
    return map(primaryKeyOrKeysOrValues, obj => getObjectByPropertiesOrCreate(realm, schema!, obj))
  }

  if (hasPrimaryKey && isEmpty(primaryKeyOrKeysOrValues)) {
    return []
  }
  // no need to recurse, we'll update the linked objects if they are not present when we go through that collection.
  return map(primaryKeyOrKeysOrValues, pk =>
    getObjectByPrimaryKeyOrTemplate(realm, schema!, pk)
  )
}

function getObjectByPropertiesOrCreate(realm: Realm, schema: Realm.ObjectSchema, values: Record<string, any>): any {
  const exstingObj = realm.objects(schema.name).find((obj: any) => {
    return toPairs(values).every(([key, value]) => obj[key] === value)
  })
  if (!isNil(exstingObj)) {
    return exstingObj
  }
  return realm.create(schema.name, values)
}

function getOrCreateLinkingObject(
  realm: Realm,
  propertyType: Realm.ObjectSchemaProperty,
  primaryKeyOrValue: string | any
): any {
  if (isNil(primaryKeyOrValue)) {
    return null
  }
  const schema = getSchemaFor(realm, propertyType.objectType)
  assert(!isNil(schema), 'schema not found')

  const hasPrimaryKey = !isNil(schema?.primaryKey)
  if (!hasPrimaryKey) {
    return getObjectByPropertiesOrCreate(realm, schema!, primaryKeyOrValue)
  }

  if (hasPrimaryKey && isEmpty(primaryKeyOrValue)) {
    throw new Error(`Type ${propertyType.objectType} has primary key but not value was provided`)
  }
  // no need to recurse, we'll update the linked objects if they are not present when we go through that collection.
  return getObjectByPrimaryKeyOrTemplate(
    realm,
    schema!,
    primaryKeyOrValue as string
  )
}

async function importEntity(
  log: Logger,
  realm: Realm,
  collectionName: string,
  entity: any,
  transactionMode: TransactionMode
): Promise<void> {
  try {
    if (transactionMode === TransactionMode.multiple) {
      realm.beginTransaction()
    }
    const schema = realm.schema.find(
      objSchema => objSchema.name === collectionName
    )
    assert(!isNil(schema), `Schema for entity ${collectionName} not found`)

    const newObject: any = {}
    for (const prop of Reflect.ownKeys(schema!.properties)) {
      const propertyName = prop.toString()
      const propType = schema!.properties[
      propertyName
      ] as Realm.ObjectSchemaProperty
      let value: any
      switch (propType.type) {
      case 'object':
        log(
          `creating linked object for ${collectionName} on property ${propertyName} value ${JSON.stringify(entity[propertyName])}`
        )
        value = getOrCreateLinkingObject(realm,
          propType,
          entity[propertyName])
        break
      case 'list':
        log(
          `creating linked object for ${collectionName} on property ${propertyName} value ${JSON.stringify(entity[propertyName])}`
        )
        value = getOrCreateLinkingObjects(
          realm,
          propType,
          entity[propertyName]
        )
        break
      default:
        value = entity[propertyName]
      }
      newObject[propertyName] = value
    }
    realm.create(collectionName, newObject, Realm.UpdateMode.Modified)
  } catch (error) {
    log(`Error writing changes for ${collectionName} `, error)
    if (transactionMode === TransactionMode.multiple) {
      realm.cancelTransaction()
      return Promise.resolve()
    }
  }
  if (transactionMode === TransactionMode.multiple) {
    realm.commitTransaction()
    return realm.syncSession?.uploadAllLocalChanges()
  }
  return Promise.resolve()
}
async function deleteRealmFiles(log: Logger, sessionId: string): Promise<void> {
  const deleteComplete = new Promise<void>((resolve, reject) => {
    rimraf(getRealmFilePath(sessionId), error => {
      if (error) {
        reject(error)
      }
      resolve()
    })
  })
  return deleteComplete
}

function getCollection(log: Logger, realm: Realm, collectionName: string): Realm.Results<Realm.Object> {
  return realm.objects(collectionName)
}

// code extracted from realm studio

function RealmObjectToJSON(this: { [key: string]: any } & Realm.Object) {
  const values: { [key: string]: any } = {}
  for (const propertyName of Object.getOwnPropertyNames(this)) {
    const value = this[propertyName]
    if (propertyName === '_realm' || typeof value === 'function') {
      continue // Skip this property
    } else {
      values[propertyName] = serializeValue(propertyName, value)
    }
  }
  return values
}

function serializeObject(object: { [key: string]: any } & Realm.Object) {
  // This is an object reference
  const objectSchema = object.objectSchema()
  if (objectSchema.primaryKey) {
    return object[objectSchema.primaryKey]
  }
  // Shallow copy the object
  return RealmObjectToJSON.call(object)
}

function serializeValue(propertyName: string, value: any) {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (value instanceof ArrayBuffer) {
    return Buffer.from(value).toString('base64')
  }
  if (
    typeof value === 'object' &&
    typeof value.objectSchema === 'function'
  ) {
    return serializeObject(value)
  }
  if (typeof value === 'object' && typeof value.length === 'number') {
    if (value.type === 'object') {
      // A list of objects
      return value.map((item: any) => {
        if (typeof item === 'object') {
          return serializeObject(item)
        }
        return item
      })
    }
    // A list of primitives
    return [...value]
  }
  throw new Error(
    `Failed to serialize '${propertyName}' field of type ${typeof value}`,
  )
}

// dependencies here
export default (log: Logger) => {
  return {
    openRealmWith: partial(openRealmWith, log),
    importEntity: partial(importEntity, log),
    deleteRealmFiles: partial(deleteRealmFiles, log),
    getCollection: partial(getCollection, log),
    prepareObjectForSeralize: (object: any) => {
      return Object.defineProperty(object, 'toJSON', {
        value: RealmObjectToJSON.bind(object),
        enumerable: false,
      })
    },
  }
}
