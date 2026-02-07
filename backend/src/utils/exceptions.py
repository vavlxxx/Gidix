from fastapi import HTTPException, status


class ApplicationError(Exception):
    detail = "Something went wrong"

    def __init__(self, detail: str | None = None):
        if detail is not None:
            self.detail = detail
        super().__init__(self.detail)


class MissingTablesError(ApplicationError):
    detail = "Missing tables"

    def __init__(self, detail: set | None = None):
        if detail is not None and isinstance(detail, set):
            self.detail = f"{self.detail}: %s" % ", ".join(map(repr, detail))
        super().__init__(self.detail)


class ObjectNotFoundError(ApplicationError):
    detail = "Object not found"


class ObjectAlreadyExistsError(ApplicationError):
    detail = "Object already exists"


class RelatedObjectExistsError(ApplicationError):
    detail = "Related object exists"


class ObjectInvalidValueError(ApplicationError):
    detail = "Object has invalid value"


class ValueOutOfRangeError(ApplicationError):
    detail = "Value out of integer range"


class CategoryNotFoundError(ObjectNotFoundError):
    detail = "Category not found"


class CategoryAlreadyExistsError(ObjectAlreadyExistsError):
    detail = "Category already exists"


class CategoryInvalidValueError(ObjectInvalidValueError):
    detail = "Category has invalid value"


class RelatedProductsExistsError(ApplicationError):
    detail = "Cannot delete category with products"


class ProductNotFoundError(ObjectNotFoundError):
    detail = "Product not found"


class ProductAlreadyExistsError(ObjectAlreadyExistsError):
    detail = "Product already exists"


class ProductInvalidValueError(ObjectInvalidValueError):
    detail = "Product has invalid value"


class ApplicationHTTPError(HTTPException):
    detail = "Something went wrong"
    status = status.HTTP_500_INTERNAL_SERVER_ERROR

    def __init__(self, detail: str | None = None):
        if detail is not None:
            self.detail = detail
        super().__init__(detail=self.detail, status_code=self.status)
