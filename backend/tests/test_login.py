import pytest
from httpx import AsyncClient

from src.utils.db_tools import DBManager


@pytest.fixture(scope="module")
async def register_user(ac: AsyncClient, db_module: DBManager) -> tuple[str, str]:
    await db_module.tokens.delete_all()
    await db_module.auth.delete_all()
    await db_module.commit()

    username = "testtest456"
    password = "testtest456"
    response = await ac.post(
        "/auth/register/",
        json={"username": username, "password": password},
    )
    assert response
    assert response.status_code == 200
    data = response.json()
    assert data
    assert data.get("username", False)
    assert data["username"] == username
    users = await db_module.auth.get_all()
    assert len(users) == 1

    return username, password


@pytest.mark.parametrize(
    "username, password, expected_response_status_code",
    [
        ("test", "test", 422),
        ("", "", 422),
        ("", "test", 422),
        ("test", "", 422),
        ("testtest", "test", 422),
        ("test", "testtest", 422),
        ("testtest123", "testtest123", 401),
        ("testtest", "testtest", 401),
        ("testtest456", "testtest456", 200),
    ],
)
async def test_login_user(
    username: str,
    password: str,
    expected_response_status_code: int,
    ac: AsyncClient,
    register_user: tuple[str, str],
) -> None:
    response = await ac.post(
        "/auth/login/",
        json={"username": username, "password": password},
    )
    assert response
    assert response.status_code == expected_response_status_code


async def test_check_login_return_body(
    ac: AsyncClient,
    db_module: DBManager,
    register_user: tuple[str, str],
) -> None:
    response = await ac.post(
        "/auth/login/",
        json={"username": register_user[0], "password": register_user[1]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data.get("access_token", False)
    assert data.get("refresh_token", False)
    assert data.get("type", "") == "Bearer"
