"""
Greenhouse ATS — Field Maps and Fill Strategy
=============================================
Pre-built knowledge of Greenhouse form structure so form discovery
isn't needed on every application.

Standard Greenhouse fields (consistent across all Greenhouse forms):
    first_name, last_name, email, phone

Custom questions use IDs like question_<number> — discovered per-form
via DISCOVER_QUESTIONS_JS, then matched against the Q&A knowledge base.

EEO fields are always comboboxes; their labels and option text are
consistent across all Greenhouse forms and stored in EEO_ANSWERS.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from profile import PROFILE, application_email  # noqa: E402
from ats.filler import build_fill_script         # noqa: E402


# ── Standard fields ────────────────────────────────────────────────────────────

STANDARD_IDS = {
    "first_name": "first_name",
    "last_name":  "last_name",
    "email":      "email",
    "phone":      "phone",
}


def standard_field_map(company_name: str) -> dict[str, str]:
    """
    Build the standard Greenhouse field map for the given company.
    Email is automatically formatted as the +jobs tagged address.
    """
    return {
        "first_name": PROFILE["first_name"],
        "last_name":  PROFILE["last_name"],
        "email":      application_email(company_name),
        "phone":      PROFILE["phone"],
    }


def fill_script(company_name: str, extra_fields: dict[str, str] | None = None) -> str:
    """
    Generate a complete batch fill JS script for a Greenhouse application.

    Args:
        company_name:  Used to construct the +jobs email address.
        extra_fields:  Additional {question_id: value} pairs for custom
                       questions discovered via DISCOVER_QUESTIONS_JS.

    Returns:
        JS string ready to pass to javascript_tool.
        Result is {field_id: 'OK' | 'NOT_FOUND'} for every key.
    """
    fields = standard_field_map(company_name)
    if extra_fields:
        fields.update(extra_fields)
    return build_fill_script(fields)


# ── EEO combobox answers ───────────────────────────────────────────────────────
# These label strings and option texts are consistent across all Greenhouse forms.
# Comboboxes can't be set via JS — they require a click sequence.
# This map drives the automated click strategy.

EEO_ANSWERS: dict[str, str] = {
    "Gender":                     "Male",
    "Are you Hispanic/Latino?":   "No",
    "Please identify your race":  "White",
    "Veteran Status":             "I am not a protected veteran",
    "Disability Status":          "No, I do not have a disability and have not had one in the past",
}


# ── Question discovery ─────────────────────────────────────────────────────────
# Inject this on a Greenhouse form to list all custom question fields.
# Returns [{id, type, label, value}] for every question_* element on the page.

DISCOVER_QUESTIONS_JS = """\
(function() {
    const questions = [];
    document.querySelectorAll('[id^="question_"]').forEach(el => {
        const label = document.querySelector('label[for="' + el.id + '"]');
        questions.push({
            id:    el.id,
            type:  el.tagName.toLowerCase(),
            label: label ? label.innerText.trim() : '',
            value: el.value || ''
        });
    });
    return questions;
})()
"""
