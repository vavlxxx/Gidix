from src.services.auth import TokenService


async def test_password_hashing():
    password = "test_password"
    hashed_password = TokenService().hash_pwd(password)
    assert hashed_password
    assert hashed_password != password
    is_same = TokenService().verify_pwd(password, hashed_password)
    assert is_same


async def test_token_hashing():
    token = "test_token"
    hashed_token = TokenService().hash_token(token)
    assert hashed_token
    assert hashed_token != token
    is_same = TokenService().verify_token(token, hashed_token)
    assert is_same
