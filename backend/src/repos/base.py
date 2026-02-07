from typing import Generic, Sequence

from asyncpg import CheckViolationError, DataError, ForeignKeyViolationError, UniqueViolationError
from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import DBAPIError, IntegrityError, NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession

from src.repos.mappers.base import (
    DataMapper,
    ModelType,
    SchemaAddType,
    SchemaReturnType,
    SchemaUpdateType,
)
from src.utils.exceptions import (
    ObjectAlreadyExistsError,
    ObjectInvalidValueError,
    ObjectNotFoundError,
    RelatedObjectExistsError,
    ValueOutOfRangeError,
)


class BaseRepo(Generic[ModelType, SchemaReturnType, SchemaAddType, SchemaUpdateType]):
    model: type[ModelType]
    schema: type[SchemaReturnType]
    mapper: type[DataMapper[ModelType, SchemaReturnType]]

    def __handle_integrity_error(self, exc: IntegrityError) -> None:
        if exc.orig and isinstance(exc.orig.__cause__, UniqueViolationError):
            raise ObjectAlreadyExistsError from exc
        if exc.orig and isinstance(exc.orig.__cause__, CheckViolationError):
            raise ObjectInvalidValueError from exc
        if exc.orig and isinstance(exc.orig.__cause__, ForeignKeyViolationError):
            raise ObjectNotFoundError from exc

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_all_filtered(
        self,
        *filter,
        offset: int | None = None,
        limit: int | None = None,
        **filter_by,
    ) -> list[SchemaReturnType]:
        query = select(self.model).filter(*filter).filter_by(**filter_by)
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        try:
            result = await self.session.execute(query)
        except DBAPIError as exc:
            if exc.orig and isinstance(exc.orig.__cause__, DataError):
                raise ValueOutOfRangeError(detail=exc.orig.__cause__.args[0]) from exc
            raise exc
        return [self.mapper.map_to_domain_entity(item) for item in result.scalars().all()]

    async def get_all(
        self,
        offset: int | None = None,
        limit: int | None = None,
    ) -> list[SchemaReturnType]:
        return await self.get_all_filtered(
            offset=offset,
            limit=limit,
        )

    async def get_one_or_none(self, *filter, **filter_by) -> SchemaReturnType | None:
        query = select(self.model).filter(*filter).filter_by(**filter_by)
        try:
            result = await self.session.execute(query)
            obj = result.scalars().one_or_none()
        except DBAPIError as exc:
            if exc.orig and isinstance(exc.orig.__cause__, DataError):
                raise ValueOutOfRangeError(detail=exc.orig.__cause__.args[0]) from exc
            raise exc

        if obj is None:
            return None
        return self.mapper.map_to_domain_entity(obj)

    async def get_one(self, *filter, **filter_by) -> SchemaReturnType:
        query = select(self.model).filter(*filter).filter_by(**filter_by)
        try:
            result = await self.session.execute(query)
            obj = result.scalar_one()
        except NoResultFound:
            raise ObjectNotFoundError
        except DBAPIError as exc:
            if exc.orig and isinstance(exc.orig.__cause__, DataError):
                raise ValueOutOfRangeError(detail=exc.orig.__cause__.args[0]) from exc
            raise exc

        return self.mapper.map_to_domain_entity(obj)

    async def add_bulk(self, data: Sequence[SchemaAddType]) -> list[SchemaReturnType]:
        add_obj_stmt = insert(self.model).values([item.model_dump() for item in data]).returning(self.model)
        try:
            result = await self.session.execute(add_obj_stmt)
        except IntegrityError as exc:
            self.__handle_integrity_error(exc)
            raise exc
        objs = result.scalars().all()
        return [self.mapper.map_to_domain_entity(item) for item in objs]

    async def add(self, data: SchemaAddType, **params) -> SchemaReturnType:
        add_obj_stmt = insert(self.model).values(**data.model_dump(), **params).returning(self.model)
        try:
            result = await self.session.execute(add_obj_stmt)
        except IntegrityError as exc:
            self.__handle_integrity_error(exc)
            raise exc

        obj = result.scalars().one()
        return self.mapper.map_to_domain_entity(obj)

    async def get_one_or_add(self, data: SchemaAddType, **params) -> tuple[bool, SchemaReturnType]:
        obj = await self.get_one_or_none(**data.model_dump())
        will_be_created = obj is None
        if will_be_created:
            obj = await self.add(data, **params)
        return (will_be_created, obj)

    async def edit(
        self,
        data: SchemaUpdateType,
        exclude_unset: bool = True,
        exclude_fields: set[str] | None = None,
        ensure_existence: bool = True,
        *filter,
        **filter_by,
    ) -> bool:
        if ensure_existence:
            await self.get_one(*filter, **filter_by)

        exclude_fields = exclude_fields or set()
        to_update = data.model_dump(exclude=exclude_fields, exclude_unset=exclude_unset)
        if not to_update:
            return False
        edit_obj_stmt = update(self.model).filter_by(**filter_by).values(**to_update)

        try:
            await self.session.execute(edit_obj_stmt)
        except IntegrityError as exc:
            self.__handle_integrity_error(exc)
            raise exc
        except DBAPIError as exc:
            if exc.orig and isinstance(exc.orig.__cause__, DataError):
                raise ValueOutOfRangeError(detail=exc.orig.__cause__.args[0]) from exc
            raise exc
        return True

    async def delete(self, *filter, ensure_existence=True, **filter_by) -> bool:
        if ensure_existence:
            await self.get_one(*filter, **filter_by)

        delete_obj_stmt = delete(self.model).filter(*filter).filter_by(**filter_by)
        try:
            await self.session.execute(delete_obj_stmt)
        except DBAPIError as exc:
            if exc.orig and isinstance(exc.orig.__cause__, DataError):
                raise ValueOutOfRangeError(detail=exc.orig.__cause__.args[0]) from exc
            if exc.orig and isinstance(exc.orig.__cause__, ForeignKeyViolationError):
                raise RelatedObjectExistsError from exc
            raise exc

        return True

    async def delete_all(self, ensure_existence=False) -> bool:
        return await self.delete(ensure_existence=ensure_existence)
