from pathlib import Path


APP_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = APP_ROOT / ".env"

SETTINGS_CONFIG = {
    "env_file": ENV_FILE,
    "extra": "ignore",
}
