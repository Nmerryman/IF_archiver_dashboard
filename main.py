from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager
import requests
import time
import sys

stat_cache = {}
src_url = "http://127.0.0.1:8080/"
if sys.platform == "linux":
    src_url = "http://192.168.192.173:8080/"

def get_progress():
    req = requests.get(src_url + "stats")
    # req = requests.get("http://192.168.192.173:8080/stats")
    return req.json()

def get_updates():
    req = requests.get(src_url + "get_recent_client_updates")
    # req = requests.get("http://192.168.192.173:8080/updates")
    return req.json()


def update_cache():
    global stat_cache
    if "latest data" in stat_cache and stat_cache["update time"] + 3 < time.time():
        stat_cache["latest data"] = get_progress()
        stat_cache["update time"] = int(time.time())
        stat_cache["client updates"] = get_updates()


@asynccontextmanager
async def lifespan(app):
    stat_cache["starting data"] = get_progress()
    stat_cache["start time"] = int(time.time())
    stat_cache["latest data"] = get_progress()
    stat_cache["update time"] = int(time.time())
    stat_cache["client updates"] = []
    print("cache loaded")
    print(stat_cache)
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/")
def read_root():
    return HTMLResponse(open("frontend/index.html").read())


@app.get("/script.js")
def read_script():
    return HTMLResponse(open("frontend/script.js").read(), media_type="text/javascript")


@app.get("/style.css")
def read_style():
    return HTMLResponse(open("frontend/style.css").read(), media_type="text/css")


@app.get("/data")
def read_data(background_tasks: BackgroundTasks):
    background_tasks.add_task(update_cache)
    return stat_cache
