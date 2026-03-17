"""
Follow-Up Email Draft Creator
==============================
Reads application_tracker.csv, finds applications where:
  - Follow Up Date <= today
  - Application Status is still "Applied"

For each due application, creates a Gmail draft to the recruiter via Gmail API.

Usage:
    # Run manually
    python pipeline/followup.py

    # Install as daily Windows Task Scheduler job (run once, as admin)
    python pipeline/followup.py --install

    # One-time Gmail OAuth setup
    python pipeline/followup.py --setup
"""

import argparse
import csv
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

JOBS_DIR = Path(__file__).parent.parent / "jobs"
TRACKER_FILE = JOBS_DIR / "application_tracker.csv"
TOKEN_FILE = Path(__file__).parent / "gmail_token.json"
CREDENTIALS_FILE = Path(__file__).parent / "gmail_credentials.json"
SCRIPT_PATH = Path(__file__).resolve()

TRACKER_HEADERS = [
    "Date Applied", "Company", "Job Title", "LinkedIn URL", "Work Mode",
    "Salary Range", "Easy Apply", "Application Status", "Notes",
    "Tailored Resume File", "Follow Up Date",
]


# ── Gmail API ──────────────────────────────────────────────────────────────────

def _get_gmail_service():
    try:
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
    except ImportError:
        sys.exit(
            "Missing Gmail API libraries. Run:\n"
            "  pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client"
        )

    SCOPES = ["https://www.googleapis.com/auth/gmail.compose"]
    creds = None

    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS_FILE.exists():
                sys.exit(
                    f"Gmail credentials not found at {CREDENTIALS_FILE}.\n"
                    "Download OAuth 2.0 credentials from Google Cloud Console and save there."
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN_FILE.write_text(creds.to_json())

    return build("gmail", "v1", credentials=creds)


def _create_draft(service, to: str, subject: str, body: str) -> str:
    import base64
    from email.mime.text import MIMEText

    msg = MIMEText(body)
    msg["to"] = to
    msg["subject"] = subject
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    draft = service.users().drafts().create(
        userId="me", body={"message": {"raw": raw}}
    ).execute()
    return draft["id"]


# ── Follow-up logic ────────────────────────────────────────────────────────────

def _due_applications() -> list[dict]:
    if not TRACKER_FILE.exists():
        return []
    today = datetime.now().date()
    due = []
    with open(TRACKER_FILE, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            status = row.get("Application Status", "").strip()
            follow_up = row.get("Follow Up Date", "").strip()
            if status != "Applied" or not follow_up:
                continue
            try:
                due_date = datetime.strptime(follow_up, "%Y-%m-%d").date()
            except ValueError:
                continue
            if due_date <= today:
                due.append(row)
    return due


def _draft_body(row: dict) -> tuple[str, str]:
    company = row.get("Company", "Unknown")
    title = row.get("Job Title", "the position")
    date_applied = row.get("Date Applied", "recently")
    sender_name = os.environ.get("CANDIDATE_FIRST_NAME", "Yury") + " " + os.environ.get("CANDIDATE_LAST_NAME", "Primakov")

    subject = f"Following up on {title} application"
    body = f"""Hi,

I wanted to follow up on my application for the {title} role at {company}, which I submitted on {date_applied}. I remain very interested in this opportunity and would love to learn more about next steps.

Please let me know if you need any additional information from me.

Best regards,
{sender_name}
"""
    return subject, body


def run_followup(dry_run: bool = False):
    due = _due_applications()
    if not due:
        print("No follow-ups due today.")
        return

    print(f"\n{len(due)} application(s) due for follow-up:\n")
    for row in due:
        company = row.get("Company", "?")
        title = row.get("Job Title", "?")
        url = row.get("LinkedIn URL", "")
        print(f"  {title} @ {company} (applied {row.get('Date Applied', '?')}, follow-up {row.get('Follow Up Date', '?')})")
        if url:
            print(f"    URL: {url}")

    if dry_run:
        print("\n[dry-run] No drafts created.")
        return

    service = _get_gmail_service()
    sender_email = os.environ.get("CANDIDATE_EMAIL_BASE", "yprimakov") + "@" + os.environ.get("CANDIDATE_EMAIL_DOMAIN", "gmail.com")
    created = 0
    for row in due:
        subject, body = _draft_body(row)
        # Draft to self for review — recruiter address unknown at this stage
        draft_id = _create_draft(service, to=sender_email, subject=subject, body=body)
        print(f"  [draft] {row.get('Job Title')} @ {row.get('Company')} → draft {draft_id}")
        created += 1

    print(f"\n[ok] {created} draft(s) created in Gmail. Review and send from your inbox.")


# ── Windows Task Scheduler installer ──────────────────────────────────────────

def install_task():
    python = sys.executable
    task_name = "JobSeekerFollowUp"
    cmd = [
        "schtasks", "/Create", "/F",
        "/TN", task_name,
        "/TR", f'"{python}" "{SCRIPT_PATH}"',
        "/SC", "DAILY",
        "/ST", "09:00",
        "/RL", "HIGHEST",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"[ok] Task '{task_name}' scheduled daily at 09:00.")
    else:
        print(f"[error] Failed to create task:\n{result.stderr}")
        print("Try running this script as Administrator.")


def setup_oauth():
    print("Starting Gmail OAuth setup...")
    _get_gmail_service()
    print(f"[ok] Token saved to {TOKEN_FILE}")


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Job application follow-up draft creator")
    parser.add_argument("--install", action="store_true", help="Install as daily Windows Task Scheduler job")
    parser.add_argument("--setup", action="store_true", help="Run one-time Gmail OAuth setup")
    parser.add_argument("--dry-run", action="store_true", help="List due applications without creating drafts")
    args = parser.parse_args()

    if args.install:
        install_task()
    elif args.setup:
        setup_oauth()
    else:
        run_followup(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
