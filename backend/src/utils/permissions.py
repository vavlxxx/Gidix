from abc import ABC, abstractmethod
from typing import Iterable

from fastapi import status
from starlette.requests import Request

from src.api.v1.dependencies.auth import CurrentUser
from src.models.auth import User
from src.utils.exceptions import NotEnoughPermissionsHTTPError


class BasePermission(ABC):
    error_msg = "You cannot perform this action"
    error_code = status.HTTP_403_FORBIDDEN

    @abstractmethod
    def has_permission(self, request: Request, current_user: User) -> bool:
        pass

    def __call__(self, request: Request, current_user: CurrentUser):
        if not self.has_permission(request, current_user):
            raise NotEnoughPermissionsHTTPError(status_code=self.error_code, detail=self.error_msg)


def any_permission(request: Request, permissions: Iterable[type[BasePermission]], current_user: User) -> bool:
    for permission_class in permissions:
        if permission_class().has_permission(request, current_user):
            return True
    return False


class IsAdminPermission(BasePermission):
    error_msg = "Only admins allowed to perform this action"

    def has_permission(self, request: Request, current_user: User) -> bool:
        return "admin" in current_user.role_names or "superuser" in current_user.role_names


class IsUserPermission(BasePermission):
    error_msg = "Only clients allowed to perform this action"

    def has_permission(self, request: Request, current_user: User) -> bool:
        return "client" in current_user.role_names


class IsSuperuserPermission(BasePermission):
    error_msg = "Only superuser allowed to perform this action"

    def has_permission(self, request: Request, current_user: User) -> bool:
        return "superuser" in current_user.role_names
