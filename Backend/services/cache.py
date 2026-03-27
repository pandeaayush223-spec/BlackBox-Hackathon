from datetime import datetime, timedelta

_cache = {}

# Module-level variable — set once at startup, never expires
global_max_precip_mm: float = 0.0


def get_cached(key: str):
    if key in _cache:
        data, timestamp = _cache[key]
        if datetime.now() - timestamp < timedelta(hours=24):
            return data
    return None


def set_cached(key: str, data):
    _cache[key] = (data, datetime.now())
