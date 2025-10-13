import fetch, { RequestInfo, RequestInit, Response } from 'node-fetch';

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryOn?: number[];
}

/**
 * Enhanced fetch with timeout, retries, and DNS error handling
 *
 * @param url - URL to fetch
 * @param options - Fetch options with retry configuration
 * @returns Response promise
 */
export async function robustFetch(
  url: RequestInfo,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    timeout = 10000, // 10 second default timeout
    retries = 3,
    retryDelay = 1000, // 1 second base delay
    retryOn = [408, 429, 500, 502, 503, 504], // Status codes to retry on
    ...fetchOptions
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if we should retry based on status code
      if (attempt < retries && retryOn.includes(response.status)) {
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        console.warn(
          `Fetch ${url} returned ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`
        );
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error: any) {
      lastError = error;

      // Check if this is a DNS or network error that we should retry
      const shouldRetry =
        attempt < retries &&
        (error.code === 'ENOTFOUND' ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNRESET' ||
          error.name === 'AbortError' ||
          error.type === 'request-timeout');

      if (shouldRetry) {
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        // Only log if it's the last attempt or not a DNS error
        if (attempt === retries - 1 || error.code !== 'ENOTFOUND') {
          console.warn(
            `Fetch ${url} failed with ${error.code || error.name}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`
          );
        }
        await sleep(delay);
        continue;
      }

      // If we shouldn't retry, throw immediately
      throw error;
    }
  }

  // If we exhausted all retries, throw the last error
  throw lastError || new Error(`Failed to fetch ${url} after ${retries} retries`);
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with JSON parsing and error handling
 */
export async function fetchJSON<T = any>(
  url: RequestInfo,
  options: FetchOptions = {}
): Promise<T> {
  const response = await robustFetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
