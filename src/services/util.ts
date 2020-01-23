import path = require('path')

export const resolvePath = (pathToResolve: string) => path.resolve(process.cwd(), pathToResolve)
