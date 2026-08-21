from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from backend.app.core.validation import normalize_wema_account


class BankAccountResolution(Protocol):
    """Result of resolving a Wema account number to an account name."""

    account_number: str
    account_name: str | None
    resolved: bool


@dataclass(frozen=True, slots=True)
class ResolutionResult:
    account_number: str
    account_name: str | None
    resolved: bool


class BankAccountVerificationService(Protocol):
    """Resolves a Wema account number to its registered account name.

    The MVP ships a manual provider because no documented Wema sandbox/name-enquiry
    API contract or credentials were supplied. A future `WemaBankAccountService`
    can implement this same protocol against the real Wema name-enquiry endpoint
    without changing onboarding, serialization, or the rest of the codebase.
    """

    provider_name: str

    def resolve(self, account_number: str) -> ResolutionResult: ...


class ManualBankAccountVerificationService:
    """Merchant-supplied account name. No external call is made or faked."""

    provider_name = "manual"

    def resolve(self, account_number: str) -> ResolutionResult:
        normalized = normalize_wema_account(account_number)
        if not normalized:
            return ResolutionResult(account_number=account_number, account_name=None, resolved=False)
        # Intentionally returns no resolved name: the merchant supplies it during
        # onboarding. Swap this for a Wema name-enquiry adapter when available.
        return ResolutionResult(account_number=normalized, account_name=None, resolved=False)


def create_bank_account_verification_service() -> ManualBankAccountVerificationService:
    return ManualBankAccountVerificationService()
