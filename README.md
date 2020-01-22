realm-migrator-cli
==================

Data migration tool for synced realms.

Grab your exported files from realm studio and import them into a fresh synced realm.

Caveats:
  - relations only work for primary keys
  - Cicular relations are not supported
  - No tests yet I'm lazy :grin:


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/realm-migrator-cli.svg)](https://npmjs.org/package/realm-migrator-cli)
[![CircleCI](https://circleci.com/gh/gonza-lito/realm-migrator-cli/tree/master.svg?style=shield)](https://circleci.com/gh/gonza-lito/realm-migrator-cli/tree/master)
[![Downloads/week](https://img.shields.io/npm/dw/realm-migrator-cli.svg)](https://npmjs.org/package/realm-migrator-cli)
[![License](https://img.shields.io/npm/l/realm-migrator-cli.svg)](https://github.com/gonza-lito/realm-migrator-cli/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g realm-migrator-cli
$ realm-migrator-cli COMMAND
running command...
$ realm-migrator-cli (-v|--version|version)
realm-migrator-cli/0.0.0 darwin-x64 node-v8.16.2
$ realm-migrator-cli --help [COMMAND]
USAGE
  $ realm-migrator-cli COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`realm-migrator-cli help [COMMAND]`](#realm-migrator-cli-help-command)
* [`realm-migrator-cli import [FILE]`](#realm-migrator-cli-import-file)


## `realm-migrator-cli help [COMMAND]`

display help for realm-migrator-cli

```
USAGE
  $ realm-migrator-cli help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.3/src/commands/help.ts)_

## `realm-migrator-cli import [SCHEMA] [JSON]`

import data from exported json file on realm studio

Steps:
on realm studio
- Save model definitions as javascript
- Save data -> JSON

run command as follows

```
USAGE
  $ realm-migrator-cli import SCHEMA JSONFILE

OPTIONS
  -h, --help                 show CLI help
  -p, --password=password    (required) password
  -r, --realmPath=realmPath  (required) realm destination path (/path)
  -s, --serverUrl=serverUrl  (required) realm object server url w/o protocol (test.us1a.cloud.realm.io)
  -u, --username=username    (required) realm user name
```

_See code: [src/commands/import.ts](https://github.com/gonza-lito/realm-migrator-cli/blob/v0.0.0/src/commands/import.ts)_
<!-- commandsstop -->
