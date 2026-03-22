import os
import requests
from typing import Generator

BITBUCKET_TOKEN = os.environ["BITBUCKET_TOKEN"]
WORKSPACE       = os.environ["WORKSPACE"]
REPO_SLUG       = os.environ["REPO_SLUG"]

def iter_branches(workspace: str, repo_slug: str, token: str) -> Generator[str, None, None]:
    url = f"https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/refs/branches"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    params  = {"pagelen": 100}

    while url:
        resp = requests.get(url, headers=headers, params=params, timeout=10)
        resp.raise_for_status()          # 401/403/404 → exception
        data = resp.json()
        for branch in data.get("values", []):
            yield branch["name"]
        url    = data.get("next")        # pagination otomatik
        params = {}                      # next URL parametreleri zaten içeriyor

if __name__ == "__main__":
    branches = sorted(iter_branches(WORKSPACE, REPO_SLUG, BITBUCKET_TOKEN))
    print(f"Toplam: {len(branches)} branch")
    for name in branches:
        print(f"  {name}")
