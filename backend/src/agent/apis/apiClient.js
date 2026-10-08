const fetch = global.fetch || require("node-fetch");

/**
 * Customizable API Client for NutriAgent Tools
 * Provides a configurable, parameterized HTTP client for invoking local or remote service APIs.
 */
class ApiClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.API_BASE_URL || "http://localhost:5000";
    this.timeout = config.timeout || 5000;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...(config.headers || {}),
    };
  }

  setBaseUrl(newUrl) {
    if (newUrl && typeof newUrl === "string") {
      let trimmed = newUrl.trim();
      while (trimmed.endsWith("/")) {
        trimmed = trimmed.slice(0, -1);
      }
      this.baseUrl = trimmed;
    }
  }

  setAuthToken(token) {
    if (token) {
      this.defaultHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith("http://") || endpoint.startsWith("https://")
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    const headers = {
      ...this.defaultHeaders,
      ...(options.headers || {}),
    };

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), options.timeout || this.timeout)
      : null;

    try {
      const fetchOptions = {
        method: options.method || "GET",
        headers,
        signal: controller ? controller.signal : undefined,
      };

      if (options.body && options.method !== "GET") {
        fetchOptions.body =
          typeof options.body === "string" ? options.body : JSON.stringify(options.body);
      }

      const response = await fetch(url, fetchOptions);
      if (timeoutId) clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const data = isJson ? await response.json() : await response.text();

      return {
        success: response.ok,
        status: response.status,
        data,
        message: response.ok ? "Success" : `HTTP ${response.status}`,
      };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      return {
        success: false,
        status: 500,
        data: null,
        message: `API request failed: ${err.message}`,
      };
    }
  }

  get(endpoint, queryParams = {}, options = {}) {
    let url = endpoint;
    const keys = Object.keys(queryParams || {});
    if (keys.length > 0) {
      const searchParams = new URLSearchParams();
      keys.forEach((k) => {
        if (queryParams[k] !== undefined && queryParams[k] !== null) {
          searchParams.append(k, String(queryParams[k]));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes("?") ? "&" : "?") + qs;
      }
    }
    return this.request(url, { ...options, method: "GET" });
  }

  post(endpoint, body = {}, options = {}) {
    return this.request(endpoint, { ...options, method: "POST", body });
  }

  put(endpoint, body = {}, options = {}) {
    return this.request(endpoint, { ...options, method: "PUT", body });
  }

  patch(endpoint, body = {}, options = {}) {
    return this.request(endpoint, { ...options, method: "PATCH", body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }
}

const defaultApiClient = new ApiClient();

module.exports = {
  ApiClient,
  defaultApiClient,
};
