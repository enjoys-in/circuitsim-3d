"""Domain-level exceptions shared across layers."""
from __future__ import annotations


class DomainError(Exception):
    """Base class for all domain errors."""


class NotFoundError(DomainError):
    """Raised when an entity cannot be located."""


class ConflictError(DomainError):
    """Raised when an operation violates a uniqueness/state constraint."""


class ValidationError(DomainError):
    """Raised when input fails business-rule validation."""
