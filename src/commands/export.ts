import {Command, flags} from '@oclif/command'
import realmDb from '../services/realm-db'
import uuid = require('uuid')
import fs = require('fs')
import {resolvePath} from '../services/util'
import JSONStream = require('JSONStream')
import {isEmpty} from 'lodash'
export default class Export extends Command {
  static description = 'describe the command here'

  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    username: flags.string({
      char: 'u',
      description: 'realm user name',
      required: true,
    }),
    password: flags.string({
      char: 'p',
      description: 'password',
      required: true,
    }),
    serverUrl: flags.string({
      char: 's',
      description: 'realm object server url w/o protocol (test.us1a.cloud.realm.io) ',
      required: true,
    }),
    realmPath: flags.string({
      char: 'r',
      description: 'source realm',
      required: true,
    }),
    collections: flags.string({
      char: 'c',
      exclusive: ['query'],
      description: 'comma separated list of Collections i.e: Dog,Person',
      default: '*',
    }),
    query: flags.string({
      char: 'q',
      exclusive: ['collections'],
      description: 'query to export supported form -> "class" where "filter" ',
    }),
    output: flags.string({
      char: 'o',
      description: 'output file',
    }),
  }

  static args = [{name: 'schema'}]

  async run() {
    const {args, flags} = this.parse(Export)
    const {username, password, serverUrl, realmPath, collections, output, query} = flags
    const {schema} = args

    const realmService = realmDb(this.log)
    const currentSessionId = uuid()
    const outputFile = output || `./realm-export-${currentSessionId}.json`

    try {
      const realm = await realmService.openRealmWith(username, password, serverUrl, realmPath, resolvePath(schema), currentSessionId)
      const fileStream = fs.createWriteStream(resolvePath(outputFile))
      const writeStream = JSONStream.stringifyObject()
      writeStream.pipe(fileStream)

      fileStream.on('finish', () => {
        fileStream.close()
      })
      if (!isEmpty(collections)) {
        switch (collections) {
        case '*':
          this.log('exporting all collections')
          realm.schema.forEach(collectionName => {
            const name = collectionName.name.toString()
            const data = realm.objects(name).map(realmService.prepareObjectForSeralize)
            this.log('data ', data)
            if (data.length !== 0) {
              writeStream.write([name, data] as any)
            }
          })
          break
        default:
          this.log('exporting all collections')
          collections.split(',').forEach(collectionName => {
            const data = realm.objects(collectionName).map(realmService.prepareObjectForSeralize)
            if (data.length !== 0) {
              writeStream.write([collectionName, data] as any)
            }
          })
        }
      }

      if (!isEmpty(query)) {
        throw new Error('Not implemented yet')
      }

      writeStream.end()
    } catch (error) {
      this.log('Error exporting collections', error)
    }

    await realmService.deleteRealmFiles(currentSessionId)
    this.log('Deleted realm files except for realm-object-server this must be removed mannually')

    this.exit()
  }
}
