from src.utils.db_tools import DBManager


class BaseService:
    def __init__(self, db: DBManager | None) -> None:
        if db is not None:
            self.db = db
