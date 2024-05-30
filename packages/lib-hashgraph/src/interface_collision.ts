type LowercaseUppercaseMap = {
  a: 'A'
  b: 'B'
  c: 'C'
  d: 'D'
  e: 'E'
  f: 'F'
  g: 'G'
  h: 'H'
  i: 'I'
  j: 'J'
  k: 'K'
  l: 'L'
  m: 'M'
  n: 'N'
  o: 'O'
  p: 'P'
  q: 'Q'
  r: 'R'
  s: 'S'
  t: 'T'
  u: 'U'
  v: 'V'
  w: 'W'
  x: 'X'
  y: 'Y'
  z: 'Z'
}

/**
 * the CamelCase version of any string
 *
 * the string isn't changed if it already is CamelCase (= starts with an uppercase letter).
 *
 * @example
 * const myString = 'MyCamelCase' satisfies CamelCase<'myCamelCase'>
 * const myString = 'MyAlreadyCamelCase' satisfies CamelCase<'MyAlreadyCamelCase'>
 */
type CamelCase<String extends string> =
  String extends `${infer FirstLetter extends keyof LowercaseUppercaseMap}${infer Rest extends string}`
    ? `${LowercaseUppercaseMap[FirstLetter]}${Rest}`
    : String

/**
 * an object with the same properties of another, but the keys prefixed by a string and CamelCased accordingly
 *
 * @example
 * const myPrefixedObject = {
 *   myPrefixMyStringProperty: 'my string'
 * } satisfies PrefixProperties<{
 *   myStringProperty: 'my string'
 * }, 'myPrefix'>
 */
export type PrefixProperties<
  ObjectType extends Record<string, unknown>,
  PropertyPrefix extends string,
  ObjectUnion extends {
    propertyName: string
    clashFreePropertyName: string
    propertyValue: unknown
  } = {
    [PropertyName in keyof ObjectType]: PropertyName extends string
      ? {
          propertyName: PropertyName
          clashFreePropertyName: `${PropertyPrefix}${CamelCase<PropertyName>}`
          propertyValue: ObjectType[PropertyName]
        }
      : never
  }[keyof ObjectType],
> = {
  [ClashFreePropertyName in ObjectUnion['clashFreePropertyName']]: ObjectUnion['propertyValue']
}
