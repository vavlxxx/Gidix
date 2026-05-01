import pytest
from httpx import AsyncClient

from src.utils.db_tools import DBManager


@pytest.fixture(scope="module")
async def prepare_db(db_module: DBManager) -> None:
    await db_module.tokens.delete_all()
    await db_module.auth.delete_all()
    await db_module.commit()


@pytest.mark.parametrize(
    "username, password, expected_response_status_code, expected_user_count",
    [
        ("test", "test", 422, 0),
        ("", "", 422, 0),
        ("", "test", 422, 0),
        ("test", "", 422, 0),
        ("testtest", "test", 422, 0),
        ("test", "testtest", 422, 0),
        ("testtest", "testtest", 200, 1),
        ("testtest", "testtest", 409, 1),
        ("testtest2", "testtest", 200, 2),
    ],
)
async def test_register_user(
    username: str,
    password: str,
    expected_response_status_code: int,
    expected_user_count: int,
    ac: AsyncClient,
    db: DBManager,
    prepare_db: None,
) -> None:
    response = await ac.post(
        "/auth/register/",
        json={"username": username, "password": password},
    )
    assert response.status_code == expected_response_status_code
    users = await db.auth.get_all()
    assert len(users) == expected_user_count


async def test_register_return_body(
    ac: AsyncClient,
) -> None:
    response = await ac.post(
        "/auth/register/",
        json={"username": "qwerty123", "password": "qwerty123"},
    )
    assert response
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "qwerty123"
    assert data["first_name"] is None
    assert data["last_name"] is None
    assert data.get("id", False)
