import {Command, flags} from '@oclif/command'
import realmDb from '../services/realm-db'
import JSONStream = require('JSONStream')
import fs = require('fs')

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
      description: 'realm object server url',
      required: true,
    }),
    realmPath: flags.string({
      char: 'r',
      description: 'realm destination path ',
      required: true,
    }),
  };

  static args = [
    {name: 'schema', required: true},
    {name: 'jsonFile', required: true},
  ];

  async run() {
    const {args, flags} = this.parse(Import)
    const realmService = realmDb(this.log)
    const {username, password, serverUrl, realmPath} = flags
    const {schema, jsonFile} = args

    try {
      this.log('opening realm')
      const realmInstance = await realmService.openRealmWith(
        username,
        password,
        serverUrl,
        realmPath,
        schema
      )

      this.log('realm opened', realmInstance)

      const logger = this.log
      const fileStream = fs.createReadStream(process.cwd() + jsonFile)

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
      this.log('done')
    } catch (error) {
      this.log(error)
      this.exit(1)
    }
    this.exit(0)
  }
}
