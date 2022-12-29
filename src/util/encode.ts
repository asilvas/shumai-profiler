export function jsonStringifyHandler(key: string, value: any) {
  if (typeof value === 'bigint') {
    return ['bigint', value.toString()] // tuple helps avoid waste
  }
  return value
}

export function jsonParseHandler(key: string, value: any) {
  if (Array.isArray(value) && value[0] === 'bigint') {
    return Number(value[1])
  }
  return value
}
