
import re
import ipaddress
from urllib.parse import urlparse

suspicious_keywords = [
    "login", "verify", "update", "secure", "account",
    "bank", "signin", "confirm", "password", "paypal",
    "credential", "authentication", "wallet", "suspend",
    "recover", "free", "bonus"
]

def extract_url_features(url):
    url = str(url).strip()
    url_lower = url.lower()

    try:
        parsed = urlparse(
            url if "://" in url else "//" + url
        )
        hostname = parsed.hostname or ""

    except (ValueError, TypeError):
        try:
            authority = url.split("://", 1)[-1].split("/", 1)[0]
            authority = authority.rsplit("@", 1)[-1]

            if authority.startswith("["):
                hostname = authority.split("]", 1)[0][1:]
            else:
                hostname = authority.split(":")[0]
        except Exception:
            hostname = ""

    try:
        ipaddress.ip_address(hostname)
        has_ip = 1
    except ValueError:
        has_ip = 0

    keyword_count = sum(
        len(re.findall(
            r"(?<![a-z0-9])" + re.escape(keyword) +
            r"(?![a-z0-9])",
            url_lower
        ))
        for keyword in suspicious_keywords
    )

    return {
        "url_length": len(url),
        "has_https": int(url_lower.startswith("https://")),
        "has_ip": has_ip,
        "dot_count": url.count("."),
        "hyphen_count": url.count("-"),
        "keyword_count": keyword_count
    }
