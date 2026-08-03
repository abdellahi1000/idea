"""The single switch for changing AI face-verification providers.

To replace Luxand with ArcFace/InsightFace/a custom model: implement
`FaceVerificationProvider` in a new module under `app/services/ai/`, add it
to `_PROVIDERS` below, and point `AI_FACE_PROVIDER` at its key. Nothing else
in the application imports a concrete provider - everything goes through
`get_face_verification_provider()`.
"""

import os

from app.services.ai.base import FaceVerificationProvider
from app.services.ai.luxand_provider import LuxandFaceVerificationProvider

_PROVIDERS: dict[str, type[FaceVerificationProvider]] = {
    "luxand": LuxandFaceVerificationProvider,
}


def get_face_verification_provider() -> FaceVerificationProvider:
    key = os.environ.get("AI_FACE_PROVIDER", "luxand")
    provider_class = _PROVIDERS.get(key)
    if provider_class is None:
        raise RuntimeError(f"Unknown AI_FACE_PROVIDER '{key}'. Available: {sorted(_PROVIDERS)}")
    return provider_class()
