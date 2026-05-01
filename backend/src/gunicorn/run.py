import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))

from src.config import settings
from src.gunicorn.app import GunicornApp, get_app_options
from src.main import app


def main():
    GunicornApp(
        app=app,
        options=get_app_options(
            host=settings.gunicorn.host,
            port=settings.gunicorn.port,
            workers=settings.gunicorn.workers,
            timeout=settings.gunicorn.timeout,
            workers_class=settings.gunicorn.workers_class,
            access_log=settings.gunicorn.access_log,
            error_log=settings.gunicorn.error_log,
            reload=settings.gunicorn.reload,
        ),
    ).run()


if __name__ == "__main__":
    main()
