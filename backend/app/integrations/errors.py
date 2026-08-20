class SocialPublishError(Exception):
    """Base error for publishing failures. `retryable` controls whether the worker retries."""

    def __init__(self, message: str, *, code: str = "unknown", retryable: bool = False):
        super().__init__(message)
        self.message = message
        self.code = code
        self.retryable = retryable


class TokenExpiredError(SocialPublishError):
    def __init__(self, message: str = "Access token has expired"):
        super().__init__(message, code="TOKEN_EXPIRED", retryable=True)


class TokenInvalidError(SocialPublishError):
    def __init__(self, message: str = "Access token is invalid"):
        super().__init__(message, code="TOKEN_INVALID", retryable=False)


class RateLimitError(SocialPublishError):
    def __init__(self, message: str = "Platform API rate limit exceeded"):
        super().__init__(message, code="RATE_LIMIT", retryable=True)


class InvalidMediaError(SocialPublishError):
    def __init__(self, message: str = "Media is invalid or unsupported"):
        super().__init__(message, code="INVALID_MEDIA", retryable=False)


class UnsupportedPostTypeError(SocialPublishError):
    def __init__(self, message: str = "This post type is not supported by the platform"):
        super().__init__(message, code="UNSUPPORTED_POST_TYPE", retryable=False)


class NetworkError(SocialPublishError):
    def __init__(self, message: str = "Network error communicating with platform"):
        super().__init__(message, code="NETWORK", retryable=True)


class PlatformApiError(SocialPublishError):
    """Generic platform API error. Defaults to non-retryable unless marked."""

    def __init__(self, message: str, *, code: str = "PLATFORM_API", retryable: bool = False):
        super().__init__(message, code=code, retryable=retryable)
