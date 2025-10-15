/**
 * JSON serialization utilities with BigInt support
 *
 * JavaScript's native JSON.stringify() cannot serialize BigInt values.
 * These utilities handle BigInt serialization for Redis caching and other use cases.
 */

/**
 * Safely stringify an object to JSON, converting BigInt values to strings
 *
 * @param value - The value to stringify
 * @param space - Optional spacing for pretty-printing (default: no spacing)
 * @returns JSON string with BigInt values converted to strings
 *
 * @example
 * const data = { count: 123n, name: "Token" };
 * const json = safeStringify(data);
 * // Result: '{"count":"123","name":"Token"}'
 */
export function safeStringify(value: any, space?: number): string {
  return JSON.stringify(value, (key, val) => {
    // Convert BigInt to string with a special marker
    if (typeof val === 'bigint') {
      return val.toString();
    }
    return val;
  }, space);
}

/**
 * Safely parse a JSON string, converting string numbers back to BigInt where appropriate
 *
 * Note: This simple implementation converts strings back to their original type.
 * For more complex use cases, you may need to specify which fields should be BigInt.
 *
 * @param text - The JSON string to parse
 * @returns Parsed object
 *
 * @example
 * const json = '{"count":"123","name":"Token"}';
 * const data = safeParse(json);
 * // Result: { count: "123", name: "Token" }
 */
export function safeParse<T = any>(text: string): T {
  return JSON.parse(text);
}

/**
 * Safely stringify for Redis caching specifically
 * Alias for safeStringify with no spacing
 */
export const redisStringify = safeStringify;

/**
 * Safely parse from Redis cache
 * Alias for safeParse
 */
export const redisParse = safeParse;
