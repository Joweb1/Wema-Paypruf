from enum import StrEnum


class PaymentStatus(StrEnum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    MISMATCH = "MISMATCH"
    NOT_RECEIVED = "NOT_RECEIVED"


class WorkflowStage(StrEnum):
    AWAITING_RECEIPT = "AWAITING_RECEIPT"
    READY_TO_VERIFY = "READY_TO_VERIFY"
    VERIFYING = "VERIFYING"
    BANK_PENDING = "BANK_PENDING"
    COMPLETE = "COMPLETE"
    ERROR = "ERROR"


class ProviderStatus(StrEnum):
    SUCCESS = "SUCCESS"
    PENDING = "PENDING"
    FAILED = "FAILED"
    REVERSED = "REVERSED"


class TimelineState(StrEnum):
    COMPLETE = "COMPLETE"
    PENDING = "PENDING"

