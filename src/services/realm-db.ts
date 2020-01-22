import Realm = require('realm')
import partial = require('lodash/partial');
import isEmpty = require('lodash/isEmpty');
import map = require('lodash/map');
import keys = require('lodash/keys');
import isArray = require('lodash/isArray');
import isNil = require('lodash/isNil');
import assert = require('assert');

type Logger = (message?: string, ...args: any[]) => void;
// eslint-disable-next-line max-params
async function openRealmWith(
  log: Logger,
  user: string,
  password: string,
  serverUrl: string,
  realmPath: string,
  schemaPath: string
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
  primaryKeyOrKeys: string | string[]
): any {
  if (isEmpty(primaryKeyOrKeys)) {
    return []
  }
  // no need to recurse, we'll update the linked objects if they are not present when we go through that collection.
  const schema = getSchemaFor(realm, propertyType.objectType)
  assert(!isNil(schema), 'schema not found')
  if (isArray(primaryKeyOrKeys)) {
    return map(primaryKeyOrKeys, pk =>
      getObjectByPrimaryKeyOrTemplate(realm, schema!, pk)
    )
  }
  return getObjectByPrimaryKeyOrTemplate(
    realm,
    schema!,
    primaryKeyOrKeys as string
  )
}

async function importEntity(
  log: Logger,
  realm: Realm,
  collectionName: string,
  entity: any
): Promise<void> {
  try {
    realm.write(() => {
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
        case 'list':
          log(
            `creating linked object for ${collectionName} on property ${propertyName} value ${entity[propertyName]}`
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
    })
  } catch (error) {
    log(`Error writing changes for ${collectionName} `, error)
  }
  return realm.syncSession?.uploadAllLocalChanges()
}

// dependencies here
export default (log: Logger) => {
  return {
    openRealmWith: partial(openRealmWith, log),
    importEntity: partial(importEntity, log),
  }
}
