import os
import json
import functools
import zipfile
from slugify import slugify
from typing import Annotated
from fastapi import FastAPI, APIRouter, Depends, Request, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel, HttpUrl


app_router = APIRouter()
security = HTTPBasic()


class AppDescriptor(BaseModel):
    name: str
    url: HttpUrl
    meta_url: HttpUrl


@functools.lru_cache()
def get_config_path():
    return os.getenv("SITEVISION_CONFIG_PATH", "./config.json")


@functools.lru_cache()
def get_settings(config_path=Depends(get_config_path)):
    print(config_path)
    with open(config_path, "r") as f:
        return json.load(f)


@app_router.post("/rest-api/1/0/{site_name}/{repository}/{app_name}/webAppImport")
async def upload_app(
    request: Request,
    site_name: str,
    repository: str,
    app_name: str,
    file: UploadFile,
    credentials: Annotated[HTTPBasicCredentials, Depends(security)],
    settings=Depends(get_settings),
) -> None:
    app_id = slugify(app_name)
    app_dir = settings.get("app_dir")
    app_path = f"{app_dir}/{app_id}"

    with zipfile.ZipFile(file.file, "r") as zip_ref:
        zip_ref.extractall(app_path)
    
    meta = {
        "id": app_id,
        "name": app_name,
        "repository": repository,
        "site_name": site_name,
        "path": app_path,
    }

    with open(f"{app_path}/_meta.json", "w") as f:
        json.dump(meta, f)

    print(
        meta
    )


@app_router.get("/apps")
async def list_apps(
    request: Request,
    settings=Depends(get_settings)
) -> list[AppDescriptor]:
    app_dir = settings.get("app_dir")
    return [
        AppDescriptor(
            name=app_name,
            url=str(
                request.url.replace(
                    path=f"/app_data/{app_name}/",
                    query=""
                )
            ),
            meta_url=str(
                request.url.replace(
                    path=f"/app_data/{app_name}/_meta.json",
                    query=""
                )
            )
        )
        for app_name in os.listdir(app_dir)
    ]


def create_app(config_path=get_config_path()):
    app = FastAPI()
    app.include_router(app_router)
    settings = get_settings(config_path=config_path)
    directories = {
        "app_data": settings.get("app_dir", "./apps"),
        **settings.get("directories", {})
    }
    for url, path in directories.items():
        if os.path.exists(path):
            print(f"Succeeded: {url}: {path}")
            app.mount(f"/{url}", StaticFiles(directory=path, html = True), name="url")
        else:
            print(f"Failed: {url}: {path}")

    return app
