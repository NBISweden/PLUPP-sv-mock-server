# SV Server
This is an experimental mock server to allow for local deployment of sitevision modules.

## Running
Start the container

```sh
docker compose up
```

Add `sv-server.local` to your `/etc/hosts` file

```
127.0.0.1       sv-server.local
```

Use a `dev_properties.json` as follows:

```json
{
    "domain": "sv-server.local:3333",
    "siteName": "Your site name",
    "addonName": "The app name",
    "username": "does not matter",
    "password": "does not matter",
    "useHTTPForDevDeploy": true
}
```

Go to `http://sv-server.local:3333/view/`

## Mocking responses
If you want to test some function without having to rely on an API being available or having the correct data you can use the `sv-server/view/data-overrides.json`. Just add any URL, which response you would like to override, as a key to the `JSON` structure and add your prefered response data as the corresponding value. An example follows:

```json
{
    "https://api.pollenrapporten.se/v1/forecasts?region_id=2a2a2a2a-2a2a-4a2a-aa2a-2a2a2a303a35&current=true": {
        "data": {
            "_meta": {
            "totalRecords": 1,
            "offset": 0,
            "limit": 100,
            "count": 1
            },
            "_links": [
                {
                    "href": "https://api.pollenrapporten.se/v1/forecasts?offset=0&limit=100&region_id=2a2a2a2a-2a2a-4a2a-aa2a-2a2a2a303a34&current=True",
                    "rel": "self"
                }
            ],
            "items": []
        }
    },
    "https://api.pollenrapporten.se/v1/pollen-types?offset=0&limit=100": {
        "ref": "data-overrides/pollen-types.json"
    }
}
```

## Custom CSS
It is possible to add snippets of custom CSS for the page when viewing an app. You can do this by adding a css file in `sv-server/view/app-settings/<addonName>.css`, where `<addonName>` is found in the apps `dev_properties.json`.

To style only the container of the webapp one could use the following CSS:
```css
#root {
    background: #144836;
    color: white;
    font-family: lato;
}
```
