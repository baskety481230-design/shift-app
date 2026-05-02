"""Generate a VAPID key pair for Web Push.

Usage:
    python -m app.scripts.gen_vapid

Then copy the printed values into backend/.env (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY)
and frontend/.env (VITE_VAPID_PUBLIC_KEY uses the public key).
"""
import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def main() -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    # Web Push public key: uncompressed point (65 bytes), base64url
    public_numbers = private_key.public_key().public_numbers()
    x = public_numbers.x.to_bytes(32, "big")
    y = public_numbers.y.to_bytes(32, "big")
    raw_public = b"\x04" + x + y

    print("VAPID_PUBLIC_KEY=" + _b64url(raw_public))
    print("VAPID_PRIVATE_KEY=" + private_pem.decode("ascii").strip().replace("\n", "\\n"))
    print()
    print("# Note: VAPID_PRIVATE_KEY above is escaped for .env. Paste as a single line.")


if __name__ == "__main__":
    main()
