const vm = require("node:vm");
const fs = require("fs")

const scriptData = fs.readFileSync(process.argv[2] || "./index.js")
const appDataDefaults = JSON.parse(fs.readFileSync(process.argv[3] || "./appDataDefaults.json", 'utf8'))
const renderRoute = process.argv[4] || "/"
const instanceId = process.argv[5] || "app"
const cookieData = JSON.parse(process.argv[6] || "{}")
const method = (process.argv[7] || "GET").toUpperCase()

function waitFor(check, finalize = () => {}, interval = 100) {
  setTimeout(() => {
    const result = check();
    if (result) {
      finalize();
    } else {
      waitFor(check, finalize, interval);
    }
  }, interval);
}

const router = {
  _finished: false,
  _get: {},
  _post: {},
  get(path, func) {
    this._get[path] = func
    waitFor(() => this._finished)
  },
  post(path, func) {
    this._post[path] = func
    waitFor(() => this._finished)
  },
  exec(path, req, res, method = "GET") {
    const routes = {
      "GET": this._get,
      "POST": this._post,
    }[method.toUpperCase()] || {}
    if (path in routes) {
      return routes[path](req, res)
    } else {
      throw new Error(`Route ${path} does not exist.`)
    }
  },
  getUrl(route) {
    return route;
  },
  finish() {
    this._finished = true;
  }
}

const svContext = vm.createContext(
  {
    require(module) {
      return {
        "router": router,
        "PortletContextUtil": {
          getCurrentPage() {}
        },
        "SiteCookieUtil": {
          resolveSiteCookieByIdentifier(identifier) {
            return {};
          },
          checkUserConsent(node) {
            return true;
          }
        },
        "Properties": {
          get() {}
        },
        "appData": {
          get(key) {
            return appDataDefaults.appData && appDataDefaults.appData[key]
          }
        },
        "requester": {
          get() {}
        },
        "Requester": {
          get(url) {
            let result = null;
            const requestObject = {
              url,
              done: (onDone) => {
                this._onDone = onDone;
                return this;
              },
              fail: (onFail) => {
                this._onFail = onFail;
                return this;
              },
              onDone: (data) => {
                if (this._onDone) this._onDone(data);
              },
              onFail: (data) => {
                if (this._onFail) this._onFail(data);
              }
            }
            fetch(url).then((response) => response.json()).then((data) => {
              requestObject.onDone(data)
            }).catch((error) => {
              requestObject.onFail(error)
            });
            return requestObject;
          }
        }
      }[module]
    },
  },
  { timeout: 10000 },
)

const request = {
  cookies: cookieData
}

const script = new vm.Script(scriptData)
const output = {
  pageData: null,
  initialState: null,
  cookie: null,
  contentType: "text/html; charset=utf-8"
}

const res = {
  agnosticRender(data, initialState) {
    const initialStateId = `${instanceId}:initial-state`
    output.pageData = `<div id="${instanceId}" data-initial-state-id="${initialStateId}">${data}</div><script id="${initialStateId}" type="application/json">${JSON.stringify(initialState, undefined, "  ")}</script>`;
    output.initialState = initialState;
    output.contentType = "text/html; charset=utf-8";
    return this;
  },
  json(data) {
    output.pageData = JSON.stringify(data);
    output.contentType = "application/json";
    return this;
  },
  cookie(cookie) {
    output.cookie = cookie;
    return this;
  },
  status(statusCode) {
    output.statusCode = statusCode;
    return this;
  }
}

try {
  script.runInContext(svContext, { timeout: 10000 });
  router.exec(renderRoute, request, res, method);
  setImmediate(() => {
    router.finish();
  });
  console.log(JSON.stringify(output));
} catch (e) {
  output.pageData = `<span class="error">${e.name}: ${e.message}</span>`;
  console.log(JSON.stringify(output));
  throw(e)
}
