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


class ValidationError(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(message=message, code="VALIDATION_ERROR")
