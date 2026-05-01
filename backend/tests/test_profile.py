import datetime
from unittest.mock import patch

from httpx import AsyncClient

from src.config import settings
from src.schemas.auth import TokenAddDTO, TokenDTO, TokenResponseDTO
from src.services.auth import TokenService
from src.utils.db_tools import DBManager
from src.utils.exceptions import (
    CannotDecodeTokenHTTPError,
    ExpiredSignatureHTTPError,
    InvalidTokenTypeHTTPError,
    MissingSubjectHTTPError,
    MissingTokenHTTPError,
    UserNotFoundHTTPError,
    WithdrawnTokenHTTPError,
)


async def test_get_user_profile(authenticated_ac: AsyncClient):
    response = await authenticated_ac.get("/auth/profile/")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin123456"
    assert data["first_name"] is None
    assert data["last_name"] is None
    assert data.get("id", False)


async def test_get_user_profile_with_invalid_token(authenticated_ac: AsyncClient):
    response = await authenticated_ac.get(
        "/auth/profile/",
        headers={"Authorization": "Bearer invalid_token"},
    )
    assert response
    assert response.status_code == CannotDecodeTokenHTTPError.status_code
    data = response.json()
    assert data["detail"] == CannotDecodeTokenHTTPError.detail


async def test_get_user_profile_without_token(authenticated_ac: AsyncClient):
    access_token = authenticated_ac.headers["Authorization"]
    del authenticated_ac.headers["Authorization"]
    response = await authenticated_ac.get("/auth/profile/")
    assert response
    assert response.status_code == 403
    authenticated_ac.headers["Authorization"] = access_token


async def test_get_user_profile_with_empty_token(authenticated_ac: AsyncClient):
    response = await authenticated_ac.get(
        "/auth/profile/",
        headers={"Authorization": "Bearer "},
    )
    assert response
    assert response.status_code == 403


async def test_get_user_profile_with_refresh_token(authenticated_ac: AsyncClient):
    refresh_token = authenticated_ac.cookies.get(settings.auth.REFRESH_TOKEN_COOKIE_KEY, None)
    response = await authenticated_ac.get(
        "/auth/profile/",
        headers={"Authorization": f"Bearer {refresh_token}"},
    )
    assert response
    assert response.status_code == InvalidTokenTypeHTTPError.status_code
    data = response.json()
    assert data["detail"] == InvalidTokenTypeHTTPError.detail.format("access", "refresh")


async def test_get_profile_by_token_with_not_existing_user(authenticated_ac: AsyncClient):
    access_token = TokenService().create_access_token({"sub": str(-1)})
    response = await authenticated_ac.get(
        "/auth/profile/",
        headers={"Authorization": f"Bearer {access_token.token}"},
    )
    assert response.status_code == UserNotFoundHTTPError.status_code
    data = response.json()
    assert data["detail"] == UserNotFoundHTTPError.detail


async def test_get_profile_witout_subject_field(authenticated_ac: AsyncClient):
    token = TokenService().create_access_token({})
    response = await authenticated_ac.get(
        "/auth/profile/",
        headers={"Authorization": f"Bearer {token.token}"},
    )
    assert response
    assert response.status_code == MissingSubjectHTTPError.status_code
    assert response.json()["detail"] == MissingSubjectHTTPError.detail


async def test_get_profile_with_expired_token(authenticated_ac: AsyncClient):
    with patch("src.config.settings.auth.JWT_EXPIRE_DELTA_ACCESS", -datetime.timedelta(hours=1)):
        expired_token = TokenService().create_access_token({})
    response = await authenticated_ac.get(
        "/auth/profile/",
        headers={"Authorization": f"Bearer {expired_token.token}"},
    )
    assert response
    assert response.status_code == ExpiredSignatureHTTPError.status_code
    data = response.json()
    assert data["detail"] == ExpiredSignatureHTTPError.detail


async def test_update_user_profile(authenticated_ac: AsyncClient):
    first_name = "John"
    last_name = "Doe"
    resp_update = await authenticated_ac.put(
        "/auth/profile/",
        json={"first_name": first_name, "last_name": last_name},
    )
    assert resp_update
    assert resp_update.status_code == 200

    resp_profile = await authenticated_ac.get("/auth/profile/")
    assert resp_profile
    assert resp_profile.status_code == 200
    data = resp_profile.json()
    assert data["first_name"] == first_name
    assert data["last_name"] == last_name


async def test_partially_update_user_profile(authenticated_ac: AsyncClient):
    first_name = "Ivan"
    last_name = "Ivanov"
    resp_update = await authenticated_ac.put(
        "/auth/profile/",
        json={"first_name": first_name},
    )
    assert resp_update
    assert resp_update.status_code == 200
    data = resp_update.json()
    assert data and "first_name" in data
    assert data["first_name"] == first_name

    resp_update = await authenticated_ac.put(
        "/auth/profile/",
        json={"last_name": last_name},
    )
    assert resp_update
    assert resp_update.status_code == 200
    data = resp_update.json()
    assert data and "last_name" in data
    assert data["last_name"] == last_name

    resp_profile = await authenticated_ac.get("/auth/profile/")
    assert resp_profile
    assert resp_profile.status_code == 200
    data = resp_profile.json()
    assert data["first_name"] == first_name
    assert data["last_name"] == last_name


async def test_update_profile_with_empty_json(authenticated_ac: AsyncClient):
    resp_update = await authenticated_ac.put(
        "/auth/profile/",
        json={},
    )
    assert resp_update
    assert resp_update.status_code == 422


async def test_get_new_tokens(authenticated_ac: AsyncClient):
    response = await authenticated_ac.get("/auth/refresh/")
    assert response.status_code == 200
    data = response.json()
    token_response = TokenResponseDTO(**data)
    assert token_response
    authenticated_ac.headers["Authorization"] = f"Bearer {token_response.access_token}"


async def test_get_new_tokens_by_access(authenticated_ac: AsyncClient):
    access_token = authenticated_ac.headers["Authorization"].split()[1]
    refresh_token = authenticated_ac.cookies[settings.auth.REFRESH_TOKEN_COOKIE_KEY]
    authenticated_ac.cookies[settings.auth.REFRESH_TOKEN_COOKIE_KEY] = access_token
    response = await authenticated_ac.get("/auth/refresh/")
    assert response
    assert response.status_code == InvalidTokenTypeHTTPError.status_code
    data = response.json()
    assert data["detail"] == InvalidTokenTypeHTTPError.detail.format("refresh", "access")
    authenticated_ac.cookies[settings.auth.REFRESH_TOKEN_COOKIE_KEY] = refresh_token


async def test_get_new_tokens_by_withdrawn_refresh_token(authenticated_ac: AsyncClient, db: DBManager):
    tokens_before_deletion = await db.tokens.get_all()
    assert tokens_before_deletion and len(tokens_before_deletion) > 0

    await db.tokens.delete_all()
    await db.commit()

    tokens_after_deletion: list[TokenDTO] = await db.tokens.get_all()
    assert not tokens_after_deletion and len(tokens_after_deletion) == 0

    response = await authenticated_ac.get("/auth/refresh/")
    assert response
    assert response.status_code == WithdrawnTokenHTTPError.status_code
    data = response.json()
    assert data["detail"] == WithdrawnTokenHTTPError.detail

    await db.tokens.add_bulk([TokenAddDTO.model_validate(token) for token in tokens_before_deletion])
    await db.commit()

    response = await authenticated_ac.get("/auth/refresh/")
    assert response
    assert response.status_code == 200


async def test_logout_user(authenticated_ac: AsyncClient) -> None:
    response = await authenticated_ac.post("/auth/logout/")
    assert response.status_code == 200
    data = response.json()
    assert data["detail"] == "Successfully logged out"
    authenticated_ac.cookies.clear()
    assert settings.auth.REFRESH_TOKEN_COOKIE_KEY not in authenticated_ac.cookies

    response = await authenticated_ac.post("/auth/logout/")
    assert response.status_code == MissingTokenHTTPError.status_code
    data = response.json()
    assert data["detail"] == MissingTokenHTTPError.detail
