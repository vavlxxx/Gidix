import json
from pathlib import Path

from src.config import BASE_DIR
from src.schemas.auth import UserRegisterDTO, UserUpdateDTO


def _load_users_fl() -> list[UserUpdateDTO]:
    path: Path = BASE_DIR / "src" / "extra" / "examples" / "users_fl.json"
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        users = json.load(f)

    assert users
    users: list[UserUpdateDTO] = [UserUpdateDTO(**user) for user in users]  # pyright: ignore
    return users


def _load_users_up() -> list[UserRegisterDTO]:
    path: Path = BASE_DIR / "src" / "extra" / "examples" / "users_up.json"
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        users = json.load(f)

    assert users
    users: list[UserRegisterDTO] = [UserRegisterDTO(**user) for user in users]  # pyright: ignore
    return users


def get_examples_auth_put_profile():
    users = _load_users_fl()
    examples = {}
    for user in users:
        examples[f"{user.first_name} {user.last_name}"] = {
            "value": user.model_dump(),
        }
    return examples


def get_examples_auth_post_login():
    users = _load_users_up()
    examples = {}
    for user in users:
        examples[f"{user.username}"] = {
            "value": user.model_dump(),
        }
    return examples
