import os
import json
from datetime import datetime, timedelta

_cache = {}

# Module-level variable — set once at startup, never expires
global_max_precip_mm: float = 0.0

CACHE_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "fingerprint_cache.json")

def load_disk_cache():
    global _cache
    if not os.path.exists(CACHE_FILE):
        return
    try:
        with open(CACHE_FILE, "r") as f:
            data = json.load(f)
            now = datetime.now()
            for k, v in data.items():
                ts = datetime.fromisoformat(v["timestamp"])
                # Retain cache if less than 30 days old; historical climate doesn't change rapidly
                if now - ts < timedelta(days=30):
                    _cache[k] = (v["data"], ts)
    except Exception as e:
        print(f"Failed to load disk cache: {e}")

def save_disk_cache():
    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        out = {}
        for k, (d, ts) in _cache.items():
            out[k] = {"data": d, "timestamp": ts.isoformat()}
        with open(CACHE_FILE, "w") as f:
            json.dump(out, f)
    except Exception as e:
        print(f"Failed to save disk cache: {e}")

def get_cached(key: str):
    if key in _cache:
        data, timestamp = _cache[key]
        if datetime.now() - timestamp < timedelta(days=30):
            return data
    return None


def set_cached(key: str, data):
    _cache[key] = (data, datetime.now())
