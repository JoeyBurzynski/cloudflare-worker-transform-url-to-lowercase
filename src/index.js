// Configuration options wrapped in an IIFE
const CONFIG = (() => {
  return {
    excludedPaths: new Set(['/exclude-this-path', '/exclude/*/dynamic']),
    redirectionStatusCode: 301,
  };
})();

/**
 * Logs a message with a specified log level.
 * @param {string} level - The log level (e.g. 'error', 'info')
 * @param {string} message - The message to log
 */
function log(level, message) {
  console[level](message);
}

/**
 * Converts wildcard characters in a pattern to their corresponding regular expression pattern.
 * @param {string} pattern - The pattern containing wildcard characters
 * @returns {string} The converted regular expression pattern
 */
function convertWildcardsToRegExp(pattern) {
  return pattern.replace(/\*/g, '[^/]*');
}

/**
 * Builds and validates a regular expression from a pattern.
 * @param {string} pattern - The regular expression pattern
 * @returns {RegExp|null} A RegExp object if the pattern is valid, or null if the pattern is invalid
 */
function buildValidRegExp(pattern) {
  try {
    const convertedPattern = convertWildcardsToRegExp(pattern);
    return new RegExp(`^${convertedPattern}`);
  } catch (error) {
    log('error', `Invalid excluded path regular expression (${pattern}): ${error.message}`);
    return null;
  }
}

/**
 * Determines if a given path should be excluded based on the excludedPaths configuration.
 * @param {string} path - The path to check
 * @returns {boolean} True if the path should be excluded, false otherwise
 */
function shouldExcludePath(path) {
  return Array.from(CONFIG.excludedPaths).some((excludedPath) => {
    const regex = buildValidRegExp(excludedPath);
    return regex?.test(path) ?? false;
  });
}

/**
 * Returns a lowercase version of the URL if the pathname is not already lowercase.
 * @param {URL} url - The URL object to process
 * @returns {string|null} The lowercase URL or null if the pathname is already lowercase
 */
function getLowerCaseUrl(url) {
  const pathLowerCase = url.pathname.toLowerCase();
  if (url.pathname === pathLowerCase || shouldExcludePath(url.pathname)) return null;

  const lowerCaseURL = new URL(url);
  lowerCaseURL.pathname = pathLowerCase;
  return lowerCaseURL.toString();
}

/**
 * Handles incoming requests and redirects to the lowercase version of the URL if required.
 * @param {Request} request - The incoming request object
 * @returns {Promise<Response>} The response object
 */
async function handleRequest(request) {
  try {
    const { method, url: requestUrl } = request;

    // Only process GET and HEAD requests
    if (method !== 'GET' && method !== 'HEAD') {
      return fetch(request);
    }

    const url = new URL(requestUrl);
    const lowerCaseUrl = getLowerCaseUrl(url);

    if (lowerCaseUrl) {
      return Response.redirect(lowerCaseUrl, CONFIG.redirectionStatusCode);
    }

    return fetch(request);
  } catch (error) {
    log('error', `Error handling request: ${error.message}`);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Event listener for incoming requests
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});
