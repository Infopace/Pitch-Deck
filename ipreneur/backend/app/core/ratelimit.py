"""Request rate limiting.

Two endpoint groups need it for different reasons:

* ``/auth/login`` and ``/auth/register`` — without a limit, password guessing
  is bounded only by network speed, and registration can be used to fill the
  users table.
* ``/projects/{id}/analyze`` and ``POST /projects`` — each analysis run costs
  real money in Gemini calls. Any signed-in account could loop them.

Limits are keyed by client IP and held in process memory, which is correct for
the single-instance deployment this ships as. Running more than one API
instance means the limits apply per instance, so move ``storage_uri`` onto
Redis at that point rather than assuming these still hold.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

#: Disabled in tests so they are not throttled by their own repetition.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    enabled=settings.app_env != "test",
    headers_enabled=True,
)

#: Credential endpoints — tight, because the cost of a wrong guess is an account.
AUTH_LIMIT = "10/minute"

#: Deck generation — each one is a paid model call, so this is a spend ceiling
#: as much as an abuse control.
GENERATION_LIMIT = "20/hour"

#: Project creation — cheap on its own, but the entry point to generation.
CREATE_LIMIT = "60/hour"
