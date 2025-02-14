async function renderApp(appName, appData, element, configElement) {
  const urlParams = new URLSearchParams(window.location.search);
  const dataRoot = `../app_data/${appName}`
  const urlRoot = `http://${window.location.host}/view`
  const defaultEnv = 'development'
  const env = urlParams.get("_env") || defaultEnv

  const reactEnvSelect = {
    'development': {
      'react': 'vendor/react.development',
      'react-dom': 'vendor/react-dom.development',
    },
    'production': {
      'react': 'vendor/react',
      'react-dom': 'vendor/react-dom',
    }
  }
  const reactEnv = reactEnvSelect[env] || reactEnvSelect[defaultEnv]
  requirejs.config({
    paths: {
      ...reactEnv,
      [appName]: `${dataRoot}/main`,
      'requester': 'requester-mock',
      'underscore': 'vendor/underscore',
    }
  });

  async function loadCss(url) {
    const response = await fetch(url);
    if (response.ok) {
      const regex = new RegExp(`\.\.\/\/webapp-files\/${appName}\/0\.0\.1`, "gi");
      const cssData = (await (response).text()).replace(regex, `${urlRoot}/${dataRoot}/resource`);

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      dataUrl = `data:text/css;base64,${btoa(cssData)}`
      link.href = dataUrl;
      document.getElementsByTagName('HEAD')[0].appendChild(link);
    } else {
      console.log(`CSS not loaded: ${url}`)
    }
  }
  
  requirejs([appName, "underscore"], function(main, _) {
    async function run() {
      await loadCss(`${dataRoot}/css/main.css`);
      await loadCss(`${urlRoot}/app-settings/${appName}.css`);
      const meta = await (await fetch(`${urlRoot}/${dataRoot}/_meta.json`)).json();
      const localizationData = await (await fetch(`${urlRoot}/${dataRoot}/i18n/sv.json`)).json();
      const defaults = await (await fetch(`${urlRoot}/${dataRoot}/appDataDefaults.json`)).json();
      const currentAppData = {...defaults.appData, ...appData, ...meta.initialState}
      if (configElement) {
        function i18n(term) {
          return localizationData[term] === undefined ? `{${term}}` : localizationData[term];
        }
        const templateData = await (await fetch(`${urlRoot}/${dataRoot}/config/index.html`)).text();
        const template = _.template(templateData);
        const configView = template({i18n: i18n});
        configElement.innerHTML = configView + `<input type="hidden" name="appName" value="${appName}"><input type="submit" value="Submit">`;
        for (const [key, value] of Object.entries(currentAppData)) {
          const el = configElement.querySelector(`[name="${key}"]`);
          if (el) {
            el.value = value;
          }
        }
      }
      try {
        element.innerHTML = meta.static_page.json.pageData;
      } catch (e) {
        console.log(e);
        console.log("Could not fetch page data: ", meta);
      }
      main.default(currentAppData, element)
    }
    run()
  }
);
}

function main() {
  const urlParams = new URLSearchParams(window.location.search);
  const appName = urlParams.get('appName');
  const appData = Array.from(urlParams.entries()).reduce((acc, [key, value]) => ({...acc, [key]: value}), {})
  const root = document.getElementById('root')
  const config = document.getElementById('config')
  if (appName === "*") {
    ["forecast-for-cities", "forecast-for-startpage", "risk-forecast"].forEach((appName) => {
      root.appendChild(document.createElement("hr"));
      const appNode = document.createElement("div");
      root.appendChild(appNode)
      renderApp(appName, {}, appNode)
    })
  } else if (appName) {
    renderApp(appName, appData, root, config)
  }
}

main()
