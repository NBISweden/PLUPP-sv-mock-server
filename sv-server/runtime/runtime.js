const vm = require("node:vm");
const fs = require("fs")
const router = {
  _routes: {},
  get(path, func) {
    this._routes[path] = func
  },
  exec(path, req, res) {
    this._routes[path](req, res)
  }
}
const svContext = vm.createContext({
  require(module) {
    return {
      "router": router,
      "PortletContextUtil": {
        getCurrentPage() {}
      },
      "Properties": {
        get() {}
      },
      "appData": {
        get() {}
      },
      "requester": {
        get() {}
      }
    }[module]
  },
})

const scriptData = fs.readFileSync(process.argv[2] || "./index.js")
const script = new vm.Script(scriptData)

const res = {
  agnosticRender(data) {
    console.log(data)
  }
}
try {
  script.runInContext(svContext)
  router.exec("/", null, res)
} catch (e) {
  console.log(`<span class="error">${e.name}: ${e.message}</span>`)
  throw(e)
}