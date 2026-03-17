#!/usr/bin/env python3
"""
Job Seeker Pipeline — First-Time Setup
=======================================
Run this once to initialize your candidate profile from your resume.
Scans your resume for contact details, asks for anything it can't find,
and writes everything to .env.

Usage:
    python pipeline/init.py
"""

import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv, set_key

ENV_FILE = Path(__file__).parent.parent / ".env"
RESUME_DIR = Path(__file__).parent.parent / "resume"

# (env_key, label, required, can_extract_from_resume)
PROFILE_FIELDS = [
    ("CANDIDATE_FIRST_NAME",      "First name",                                True,  True),
    ("CANDIDATE_LAST_NAME",       "Last name",                                 True,  True),
    ("CANDIDATE_EMAIL_BASE",      "Email username (part before @)",            True,  True),
    ("CANDIDATE_EMAIL_DOMAIN",    "Email domain (part after @)",               True,  True),
    ("CANDIDATE_PHONE",           "Phone number",                              True,  True),
    ("CANDIDATE_WEBSITE",         "Personal website URL",                      False, True),
    ("CANDIDATE_LINKEDIN",        "LinkedIn profile URL",                      False, True),
    ("CANDIDATE_LOCATION",        "Location (e.g. Austin, TX)",                False, True),
    ("CANDIDATE_CURRENT_EMPLOYER","Current / most recent employer name",       False, True),
    ("CANDIDATE_FORWARDING_EMAIL","Forwarding email where Claude reads codes", True,  False),
]


# ── Helpers ────────────────────────────────────────────────────────────────────

def print_banner():
    print()
    print("╔══════════════════════════════════════════════════════╗")
    print("║        Job Seeker Pipeline — First-Time Setup        ║")
    print("╚══════════════════════════════════════════════════════╝")
    print()


def prompt(label: str, default: str = "", required: bool = True) -> str:
    """Prompt the user for a value, showing any existing default."""
    suffix = f" [{default}]" if default else (" (optional, press Enter to skip)" if not required else "")
    while True:
        val = input(f"  {label}{suffix}: ").strip()
        if not val and default:
            return default
        if not val and not required:
            return ""
        if not val and required:
            print(f"  [!] {label} is required.")
            continue
        return val


def load_existing_env() -> dict:
    """Load whatever is already in .env so we don't overwrite it."""
    if not ENV_FILE.exists():
        return {}
    load_dotenv(ENV_FILE, override=False)
    keys = [f[0] for f in PROFILE_FIELDS] + ["ANTHROPIC_API_KEY"]
    return {k: os.environ.get(k, "") for k in keys}


def write_env_key(key: str, value: str):
    """Set a single key in .env without touching any other keys."""
    set_key(str(ENV_FILE), key, value, quote_mode="never")


# ── Resume extraction ──────────────────────────────────────────────────────────

def find_resume() -> Path | None:
    """Find a resume file (PDF or DOCX) in the resume/ folder."""
    for pattern in ("*.docx", "*.pdf"):
        matches = sorted(RESUME_DIR.glob(pattern))
        if matches:
            return matches[0]
    return None


def extract_text_from_resume(path: Path) -> str:
    """Extract raw text from a DOCX or PDF resume."""
    suffix = path.suffix.lower()

    if suffix == ".docx":
        try:
            from docx import Document
            doc = Document(path)
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception as e:
            print(f"  [!] Could not read DOCX: {e}")
            return ""

    if suffix == ".pdf":
        # Try pypdf first
        try:
            import pypdf
            reader = pypdf.PdfReader(path)
            return "\n".join(
                page.extract_text() or "" for page in reader.pages
            )
        except ImportError:
            pass
        # Fallback: pdfplumber
        try:
            import pdfplumber
            with pdfplumber.open(path) as pdf:
                return "\n".join(
                    page.extract_text() or "" for page in pdf.pages
                )
        except ImportError:
            print("  [!] PDF parsing requires pypdf or pdfplumber.")
            print("       Run:  pip install pypdf")
            return ""
        except Exception as e:
            print(f"  [!] Could not read PDF: {e}")
            return ""

    return ""


# ── Claude extraction ──────────────────────────────────────────────────────────

EXTRACT_PROMPT = """\
Extract the candidate's contact and professional details from this resume text.

RESUME TEXT:
{resume_text}

Return a JSON object with exactly these keys (use null for anything not found):
{{
  "first_name": "...",
  "last_name": "...",
  "email": "full email address if present",
  "phone": "...",
  "website": "personal website URL (not LinkedIn)",
  "linkedin": "full LinkedIn profile URL",
  "location": "City, State or City, Country",
  "current_employer": "name of the most recent employer"
}}

Return only valid JSON. No markdown fences, no explanation.
"""


def extract_profile_with_claude(api_key: str, resume_text: str) -> dict:
    """Use Claude to extract profile fields from resume text."""
    import anthropic
    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=500,
        messages=[{"role": "user", "content": EXTRACT_PROMPT.format(resume_text=resume_text)}],
    )
    raw = response.content[0].text.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


def map_extracted_to_env(extracted: dict) -> dict:
    """Convert Claude's extracted dict to env key/value pairs."""
    result = {}

    result["CANDIDATE_FIRST_NAME"] = extracted.get("first_name") or ""
    result["CANDIDATE_LAST_NAME"]  = extracted.get("last_name") or ""

    email = extracted.get("email") or ""
    if "@" in email:
        base, domain = email.rsplit("@", 1)
        result["CANDIDATE_EMAIL_BASE"]   = base
        result["CANDIDATE_EMAIL_DOMAIN"] = domain
    else:
        result["CANDIDATE_EMAIL_BASE"]   = ""
        result["CANDIDATE_EMAIL_DOMAIN"] = ""

    result["CANDIDATE_PHONE"]            = extracted.get("phone") or ""
    result["CANDIDATE_WEBSITE"]          = extracted.get("website") or ""
    result["CANDIDATE_LINKEDIN"]         = extracted.get("linkedin") or ""
    result["CANDIDATE_LOCATION"]         = extracted.get("location") or ""
    result["CANDIDATE_CURRENT_EMPLOYER"] = extracted.get("current_employer") or ""

    return result


# ── Main flow ──────────────────────────────────────────────────────────────────

def main():
    print_banner()

    existing = load_existing_env()

    # ── Step 1: Anthropic API key ──────────────────────────────────────────────
    api_key = existing.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        print("Step 1: Anthropic API Key")
        print("  Get yours at: https://console.anthropic.com/")
        api_key = prompt("ANTHROPIC_API_KEY", required=True)
        write_env_key("ANTHROPIC_API_KEY", api_key)
        print()
    else:
        print(f"  [✓] ANTHROPIC_API_KEY already set.\n")

    # ── Step 2: Resume ─────────────────────────────────────────────────────────
    print("Step 2: Resume")
    RESUME_DIR.mkdir(exist_ok=True)
    print(f"  Copy your resume (PDF or DOCX) into:  {RESUME_DIR}")
    input("  Press Enter when ready...")

    resume_path = find_resume()
    extracted = {}

    if resume_path:
        print(f"  [✓] Found: {resume_path.name}")
        print("  Extracting text from resume...")
        resume_text = extract_text_from_resume(resume_path)

        if resume_text.strip():
            print("  Analyzing with Claude...")
            try:
                raw = extract_profile_with_claude(api_key, resume_text)
                extracted = map_extracted_to_env(raw)
                print("  [✓] Extraction complete.\n")
            except Exception as e:
                print(f"  [!] Claude extraction failed: {e}")
                print("  Will ask for each field manually.\n")
        else:
            print("  [!] Could not extract text from resume. Will ask manually.\n")
    else:
        print("  [!] No resume found in the resume/ folder.")
        print("  Will ask for each field manually.\n")

    # ── Step 3: Review and fill missing fields ─────────────────────────────────
    print("Step 3: Candidate Profile")
    print("  Review extracted values (press Enter to accept, or type a correction):\n")

    final = {}
    for env_key, label, required, from_resume in PROFILE_FIELDS:
        # Priority: existing .env > extracted from resume > empty
        default = existing.get(env_key) or extracted.get(env_key, "")
        value = prompt(label, default=default, required=required)
        final[env_key] = value

    # ── Step 4: Write to .env ──────────────────────────────────────────────────
    print()
    print("Writing to .env...")
    for key, value in final.items():
        if value:  # don't write empty optional fields
            write_env_key(key, value)

    # ── Step 5: Summary ────────────────────────────────────────────────────────
    print()
    print("╔══════════════════════════════════════════════════════╗")
    print("║                  Setup Complete!                     ║")
    print("╚══════════════════════════════════════════════════════╝")
    print()

    first = final.get("CANDIDATE_FIRST_NAME", "")
    last  = final.get("CANDIDATE_LAST_NAME", "")
    email_base   = final.get("CANDIDATE_EMAIL_BASE", "")
    email_domain = final.get("CANDIDATE_EMAIL_DOMAIN", "")
    fwd   = final.get("CANDIDATE_FORWARDING_EMAIL", "")

    print(f"  Candidate:    {first} {last}")
    if email_base and email_domain:
        print(f"  Email format: {email_base}+jobs-<company>@{email_domain}")
    if fwd:
        print(f"  Forwarding:   {fwd}")
    print()
    print("  Next steps:")
    print("    1. Place your base resume text in:  pipeline/resume_base.md")
    print("    2. Tailor your first resume:        python pipeline/tailor_resume.py --jd <file>")
    print()


if __name__ == "__main__":
    main()
