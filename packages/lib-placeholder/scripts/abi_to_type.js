import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { cwd } from 'node:process'

/**
 * cd packages/lib-placeholder/abi/ # run this from within the abi folder
 * ls -l *.json # you'll need to pass all json files
 * node ../scripts/abi_to_type.js ActivePool.json # ... pass all files you want. uses the file path relative to where this script is run from.
 */
const main = async () => {
  const abiFiles = process.argv.filter((string) => string.endsWith('.json'))

  await Promise.all(
    abiFiles.map(async (filePath) => {
      const absoluteFilePath = resolve(cwd(), filePath)
      const jsonFileBuffer = await readFile(absoluteFilePath)
      const jsonFileString = jsonFileBuffer.toString()
      const contractName = basename(filePath, '.json')
      const typeName = `${contractName}Abi`
      const constName = `${contractName.charAt(0).toLowerCase()}${contractName.substring(1)}Abi`
      const untypedConstName = `untyped${contractName}Abi`
      const abiFileString = `import ${untypedConstName} from './${contractName}.json'

export const ${constName} = ${untypedConstName} as ${typeName}
      
export type ${typeName} = ${jsonFileString}
`
      const typeFileDirname = dirname(absoluteFilePath)
      const typeFileName = resolve(typeFileDirname, `${contractName}.ts`)
      await writeFile(typeFileName, abiFileString)
    }),
  )
}

main()
