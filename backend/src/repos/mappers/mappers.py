from src.models.auth import Token, User
from src.repos.mappers.base import DataMapper
from src.schemas.auth import TokenDTO, UserDTO


class AuthMapper(DataMapper[User, UserDTO]):
    model = User
    schema = UserDTO


class TokenMapper(DataMapper[Token, TokenDTO]):
    model = Token
    schema = TokenDTO
