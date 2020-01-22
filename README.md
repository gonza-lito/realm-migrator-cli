realm-migrator-cli
==================

data migration tool for realm

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
* [`realm-migrator-cli hello [FILE]`](#realm-migrator-cli-hello-file)
* [`realm-migrator-cli help [COMMAND]`](#realm-migrator-cli-help-command)
* [`realm-migrator-cli import [FILE]`](#realm-migrator-cli-import-file)

## `realm-migrator-cli hello [FILE]`

describe the command here

```
USAGE
  $ realm-migrator-cli hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ realm-migrator-cli hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/gonza-lito/realm-migrator-cli/blob/v0.0.0/src/commands/hello.ts)_

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

## `realm-migrator-cli import [FILE]`

describe the command here

```
USAGE
  $ realm-migrator-cli import [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print
```

_See code: [src/commands/import.ts](https://github.com/gonza-lito/realm-migrator-cli/blob/v0.0.0/src/commands/import.ts)_
<!-- commandsstop -->
