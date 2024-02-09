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