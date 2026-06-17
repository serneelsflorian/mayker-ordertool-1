class AppException(Exception):
    """Base class for all application exceptions."""

    def __init__(self, message: str, code: str) -> None:
        self.message = message
        self.code = code
        super().__init__(message)


class OrderNotFoundError(AppException):
    def __init__(self, order_id: str) -> None:
        super().__init__(
            message=f"Order '{order_id}' not found",
            code="ORDER_NOT_FOUND",
        )


class MenuItemNotFoundError(AppException):
    def __init__(self, item_id: str) -> None:
        super().__init__(
            message=f"Menu item '{item_id}' not found",
            code="MENU_ITEM_NOT_FOUND",
        )


class GuestNotFoundError(AppException):
    def __init__(self, guest_id: str) -> None:
        super().__init__(
            message=f"Guest '{guest_id}' not found",
            code="GUEST_NOT_FOUND",
        )


class GuestSelectionNotFoundError(AppException):
    def __init__(self, selection_id: str) -> None:
        super().__init__(
            message=f"Guest selection '{selection_id}' not found",
            code="GUEST_SELECTION_NOT_FOUND",
        )


class OrderClosedError(AppException):
    def __init__(self) -> None:
        super().__init__(
            message="Order is closed and can no longer be modified",
            code="ORDER_CLOSED",
        )


class ValidationError(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(message=message, code="VALIDATION_ERROR")


class OrderNotClosedError(AppException):
    def __init__(self) -> None:
        super().__init__(
            message="Order must be closed before an email can be sent",
            code="ORDER_NOT_CLOSED",
        )


class EmailSendError(AppException):
    def __init__(self, detail: str = "") -> None:
        super().__init__(
            message=f"Failed to send email{': ' + detail if detail else ''}",
            code="EMAIL_SEND_FAILED",
        )
