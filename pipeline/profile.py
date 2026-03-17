"""
Candidate Profile
=================
Single source of truth for all personal information used across the pipeline.
All values are loaded from environment variables — nothing is hardcoded here.

To configure, add these to your .env file:

    CANDIDATE_FIRST_NAME=Jane
    CANDIDATE_LAST_NAME=Smith
    CANDIDATE_EMAIL_BASE=janesmith          # the part before @
    CANDIDATE_EMAIL_DOMAIN=gmail.com        # the part after @
    CANDIDATE_FORWARDING_EMAIL=mybot@gmail.com  # where security codes get forwarded
    CANDIDATE_PHONE=555-867-5309
    CANDIDATE_WEBSITE=janesmith.com
    CANDIDATE_LINKEDIN=https://www.linkedin.com/in/janesmith/
    CANDIDATE_LOCATION=Austin, TX
    CANDIDATE_CURRENT_EMPLOYER=Acme Corp    # used in resume tailoring prompts

Application emails are constructed as:
    {CANDIDATE_EMAIL_BASE}+jobs-{company}@{CANDIDATE_EMAIL_DOMAIN}
e.g. janesmith+jobs-google@gmail.com
"""

import os
import re
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")


def _req(key: str) -> str:
    val = os.environ.get(key, "").strip()
    if not val:
        raise EnvironmentError(
            f"Required profile variable not set: {key}\n"
            f"Add it to your .env file. See pipeline/profile.py for the full list."
        )
    return val


def _opt(key: str, default: str = "") -> str:
    return os.environ.get(key, default).strip()


PROFILE = {
    "first_name":       _req("CANDIDATE_FIRST_NAME"),
    "last_name":        _req("CANDIDATE_LAST_NAME"),
    "full_name":        f"{_req('CANDIDATE_FIRST_NAME')} {_req('CANDIDATE_LAST_NAME')}",
    "email_base":       _req("CANDIDATE_EMAIL_BASE"),
    "email_domain":     _req("CANDIDATE_EMAIL_DOMAIN"),
    "forwarding_email": _req("CANDIDATE_FORWARDING_EMAIL"),
    "phone":            _req("CANDIDATE_PHONE"),
    "website":          _opt("CANDIDATE_WEBSITE"),
    "linkedin":         _opt("CANDIDATE_LINKEDIN"),
    "location":         _opt("CANDIDATE_LOCATION"),
    "current_employer": _opt("CANDIDATE_CURRENT_EMPLOYER"),
}


def application_email(company_name: str) -> str:
    """Return the +jobs tagged email address for a given company.

    Example: application_email("Google") -> "janesmith+jobs-google@gmail.com"
    """
    slug = re.sub(r"[^a-z0-9]+", "-", company_name.lower()).strip("-")
    return f"{PROFILE['email_base']}+jobs-{slug}@{PROFILE['email_domain']}"
