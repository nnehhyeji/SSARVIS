from app.exceptions.base import AppError


class InfrastructureError(AppError):
    """Infrastructure integration error."""


class VectorDBError(InfrastructureError):
    """Vector database integration error."""


class VectorDBClientClosedError(VectorDBError):
    """Vector database client is already closed."""
