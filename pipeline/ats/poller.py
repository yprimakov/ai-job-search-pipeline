"""
Security Code Poller
====================
Polls the forwarding inbox (CANDIDATE_FORWARDING_EMAIL) for verification
codes sent by ATS platforms after form submission.

Two usage modes:

1. MODULE — called by Claude during a browser session via Zapier MCP.
   Use build_query() to get the Gmail search string, then pass the
   email body to extract_code() once an email is found.

2. CLI — standalone polling loop using the Gmail API directly.
   Useful for testing or if Zapier is unavailable.

   python pipeline/ats/poller.py --company anthropic
   python pipeline/ats/poller.py --company google --timeout 180

Gmail API setup (one-time, for CLI mode):
    pip install google-auth-oauthlib google-api-python-client
    Then run once to authorize:
        python pipeline/ats/poller.py --setup
"""

import argparse
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / ".env")

FORWARDING_EMAIL = os.environ.get("CANDIDATE_FORWARDING_EMAIL", "")
CREDENTIALS_PATH = Path.home() / ".config" / "job-seeker" / "gmail_credentials.json"
TOKEN_PATH       = Path.home() / ".config" / "job-seeker" / "gmail_token.json"
SCOPES           = ["https://www.googleapis.com/auth/gmail.readonly"]

# Regex to extract an 8-character alphanumeric security code.
# Greenhouse uses exactly 8 chars; adjust if other ATSes differ.
_CODE_PATTERN = re.compile(r'\b([A-Za-z0-9]{8})\b')


# ── Module API (used by Claude during sessions) ────────────────────────────────

def build_query(company_name: str, after: datetime | None = None) -> str:
    """
    Build a Gmail search query to find the verification email for this application.

    Args:
        company_name: e.g. "Anthropic" — used to narrow the search
        after:        datetime (UTC) — only return emails after this time.
                      Defaults to 5 minutes ago.

    Returns:
        Gmail search query string, ready to pass to gmail_find_email(query=...).
    """
    if after is None:
        after = datetime.now(timezone.utc)
    # Gmail 'after:' uses Unix timestamp
    ts = int(after.timestamp()) - 30  # 30-second buffer
    company_slug = company_name.lower().replace(" ", "")
    return (
        f"(subject:verify OR subject:verification OR subject:security OR subject:confirm OR subject:code) "
        f"after:{ts}"
    )


def extract_code(text: str) -> str | None:
    """
    Extract the security code from an email body.

    Strategy (in order of preference):
    1. Token directly after "code", "is", ":" with mixed case or digits
    2. Any 8-char token containing at least one digit AND one letter
    3. Any 8-char token containing mixed case (upper + lower)
    """
    # Pattern 1: token near trigger words, allowing filler like "is"
    near_trigger = re.compile(
        r'(?:code|token|verify|verification|security)\b[^A-Za-z0-9]{0,10}([A-Za-z0-9]{8})\b',
        re.IGNORECASE,
    )
    m = near_trigger.search(text)
    if m:
        candidate = m.group(1)
        # Reject pure lowercase dictionary-looking words
        if re.search(r'[0-9]', candidate) or re.search(r'[A-Z]', candidate):
            return candidate

    # Pattern 2: standalone 8-char token with at least one digit and one letter
    mixed_digit = re.compile(r'\b([A-Za-z0-9]{8})\b')
    for m in mixed_digit.finditer(text):
        candidate = m.group(1)
        if re.search(r'[0-9]', candidate) and re.search(r'[A-Za-z]', candidate):
            return candidate

    # Pattern 3: mixed-case 8-char token (upper + lower, no digits required)
    for m in mixed_digit.finditer(text):
        candidate = m.group(1)
        if re.search(r'[A-Z]', candidate) and re.search(r'[a-z]', candidate):
            return candidate

    return None


# ── CLI mode (direct Gmail API polling) ───────────────────────────────────────

def _get_gmail_service():
    """Authenticate and return a Gmail API service object."""
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
    except ImportError:
        sys.exit(
            "Gmail API libraries not installed.\n"
            "Run:  pip install google-auth-oauthlib google-api-python-client"
        )

    creds = None
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS_PATH.exists():
                sys.exit(
                    f"Gmail credentials not found at {CREDENTIALS_PATH}\n"
                    "Run:  python pipeline/ats/poller.py --setup"
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_PATH), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
        TOKEN_PATH.write_text(creds.to_json())

    from googleapiclient.discovery import build
    return build("gmail", "v1", credentials=creds)


def _search_gmail(service, query: str) -> list[dict]:
    """Return a list of matching message bodies from the Gmail API."""
    import base64
    result = service.users().messages().list(userId="me", q=query, maxResults=5).execute()
    messages = result.get("messages", [])
    bodies = []
    for msg in messages:
        full = service.users().messages().get(userId="me", id=msg["id"], format="full").execute()
        payload = full.get("payload", {})
        # Try plain text part first, then raw body
        for part in payload.get("parts", []):
            if part.get("mimeType") == "text/plain":
                data = part["body"].get("data", "")
                if data:
                    bodies.append(base64.urlsafe_b64decode(data).decode("utf-8", errors="replace"))
        if not bodies:
            data = payload.get("body", {}).get("data", "")
            if data:
                bodies.append(base64.urlsafe_b64decode(data).decode("utf-8", errors="replace"))
    return bodies


def poll_cli(company: str, timeout: int = 120, interval: int = 5):
    """
    Poll the forwarding inbox for a security code. Prints the code to stdout
    when found. Used in CLI mode.
    """
    service = _get_gmail_service()
    start   = datetime.now(timezone.utc)
    query   = build_query(company, after=start)

    print(f"Polling for security code from '{company}'...")
    print(f"Query: {query}\n")

    deadline = time.time() + timeout
    while time.time() < deadline:
        bodies = _search_gmail(service, query)
        for body in bodies:
            code = extract_code(body)
            if code:
                print(f"\n[✓] Security code found: {code}")
                return code
        remaining = int(deadline - time.time())
        print(f"  No code yet — retrying in {interval}s ({remaining}s remaining)...", end="\r")
        time.sleep(interval)

    print("\n[!] Timed out waiting for security code.")
    return None


def setup_gmail_credentials():
    """Guide the user through downloading Gmail API credentials."""
    print("""
Gmail API Setup
===============
1. Go to: https://console.cloud.google.com/
2. Create a project (or select an existing one)
3. Enable the Gmail API: APIs & Services > Enable APIs > Gmail API
4. Create credentials: APIs & Services > Credentials > Create > OAuth client ID
   - Application type: Desktop app
5. Download the JSON file and save it to:
""")
    print(f"   {CREDENTIALS_PATH}\n")
    print("Then run:  python pipeline/ats/poller.py --company <name>")


# ── Entry point ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Poll for ATS verification codes")
    parser.add_argument("--company",  help="Company name (e.g. 'anthropic')")
    parser.add_argument("--timeout",  type=int, default=120, help="Max wait in seconds (default: 120)")
    parser.add_argument("--interval", type=int, default=5,   help="Poll interval in seconds (default: 5)")
    parser.add_argument("--setup",    action="store_true",   help="Show Gmail API setup instructions")
    args = parser.parse_args()

    if args.setup:
        setup_gmail_credentials()
        return

    if not args.company:
        parser.error("--company is required (unless using --setup)")

    poll_cli(args.company, timeout=args.timeout, interval=args.interval)


if __name__ == "__main__":
    main()
