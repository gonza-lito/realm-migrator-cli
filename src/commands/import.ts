import {Command, flags} from '@oclif/command'
import realmDb from '../services/realm-db'
import JSONStream = require('JSONStream')
import path = require('path')
import fs = require('fs')
import uuid = require('uuid');

export default class Import extends Command {
  static description = 'describe the command here';

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
      description: 'realm destination path (/path)',
      required: true,
    }),
    clean: flags.boolean({
      char: 'c',
      description: 'delete realm files after',
      default: true,
    }),
  }

  static args = [
    {name: 'schema', required: true},
    {name: 'jsonFile', required: true},
  ]

  async run() {
    const {args, flags} = this.parse(Import)
    const realmService = realmDb(this.log)
    const {username, password, serverUrl, realmPath, clean} = flags
    const {schema, jsonFile} = args
    const currentSessionId = uuid()
    try {
      this.log('opening realm')
      const realmInstance = await realmService.openRealmWith(
        username,
        password,
        serverUrl,
        realmPath,
        path.resolve(process.cwd(), schema),
        currentSessionId
      )

      this.log('realm opened', realmInstance)

      const logger = this.log
      const fileStream = fs.createReadStream(path.resolve(process.cwd(), jsonFile))

      const stream = fileStream.pipe(JSONStream.parse([true, {emitPath: true}]))
      const completion = new Promise((resolve, reject) => {
        this.log('parsing json file')
        try {
          stream
          .on('data', function (this: NodeJS.ReadWriteStream, data: any) {
            logger('parsed', data)
            this.pause()
            const {value, path} = data
            realmService
            .importEntity(realmInstance, path[0], value)
            .then(() => this.resume())
          })
          .on('end', function (this: NodeJS.ReadWriteStream) {
            resolve()
          })
        } catch (error) {
          reject(error)
        }
      })

      await completion
      stream.end()
      stream.removeAllListeners()
      fileStream.close()
      realmInstance.close()

      if (clean) {
        await realmService.deleteRealmFiles(currentSessionId)
        this.log('Deleted realm files except for realm-object-server this must be removed mannually')
      }
    } catch (error) {
      this.log(error)
      this.exit(1)
    }
    this.exit(0)
  }
}
