"""
Combobox Selector
=================
JS-based combobox option selection — no screenshots, no coordinate math.

Replaces the screenshot → calculate coords → click → screenshot cycle
with a single javascript_tool call that opens the dropdown and clicks
the matching option directly via DOM traversal.

Works for:
  - Greenhouse React Select comboboxes (role="combobox" / role="option")
  - Native <select> elements
  - Generic dropdown patterns (ul > li, div[role="listbox"])

Usage:
    from ats.combobox import build_select_script, build_select_many_script

    # Select one option
    js = build_select_script("Gender", "Male")

    # Select multiple options in sequence (e.g. all EEO fields at once)
    js = build_select_many_script({
        "Gender":                   "Male",
        "Are you Hispanic/Latino?": "No",
        "Veteran Status":           "I am not a protected veteran",
    })

    # → pass js to mcp__claude-in-chrome__javascript_tool
    # Result: {"Gender": "OK", "Are you Hispanic/Latino?": "OK", ...}
"""

import json

# Core async selection function.
# Finds the combobox by its visible label text, opens it, waits for
# the dropdown to render, then clicks the matching option.
_SELECT_FN = """\
async function selectByLabel(labelText, optionText) {
    // Find the label element containing the text
    const allLabels = Array.from(document.querySelectorAll('label, [class*="label"], legend'));
    const label = allLabels.find(el =>
        el.innerText && el.innerText.trim().replace(/\\s+/g, ' ').includes(labelText)
    );

    if (!label) return `LABEL_NOT_FOUND: ${labelText}`;

    // From the label, find the nearest combobox trigger
    const forId = label.getAttribute('for');
    let trigger = forId ? document.getElementById(forId) : null;

    if (!trigger) {
        // Walk up to the field container, then find the trigger inside it
        const container = label.closest('[class*="field"], [class*="select"], [class*="input"], .field, li')
                       || label.parentElement;
        trigger = container
            ? container.querySelector('[role="combobox"], button, [class*="control"], [class*="trigger"]')
            : null;
    }

    // Handle native <select> elements directly — no click needed
    if (trigger && trigger.tagName === 'SELECT') {
        const opt = Array.from(trigger.options).find(o =>
            o.text.trim() === optionText || o.text.trim().includes(optionText)
        );
        if (!opt) return `OPTION_NOT_FOUND: ${optionText}`;
        trigger.value = opt.value;
        trigger.dispatchEvent(new Event('change', { bubbles: true }));
        return `OK: ${optionText}`;
    }

    if (!trigger) return `TRIGGER_NOT_FOUND: ${labelText}`;

    // Open the dropdown
    trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    trigger.click();

    // Wait for dropdown to render (React needs a paint cycle)
    await new Promise(r => setTimeout(r, 300));

    // Find the option by text in any open dropdown list
    const optionSelectors = '[role="option"], [class*="option"], [class*="menu-item"], li';
    const allOptions = Array.from(document.querySelectorAll(optionSelectors));
    const match = allOptions.find(el =>
        el.innerText && (
            el.innerText.trim() === optionText ||
            el.innerText.trim().startsWith(optionText)
        )
    );

    if (!match) {
        // Close the dropdown and report failure
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return `OPTION_NOT_FOUND: ${optionText}`;
    }

    match.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    match.click();

    // Brief pause so React can process the selection
    await new Promise(r => setTimeout(r, 100));

    return `OK: ${optionText}`;
}\
"""


def build_select_script(label_text: str, option_text: str) -> str:
    """
    Generate JS to select a single combobox option by its label and option text.

    Args:
        label_text:  Visible label string, e.g. "Gender" or "Veteran Status"
        option_text: The option to select, e.g. "Male" or "I am not a protected veteran"

    Returns:
        Async JS string. Result is "OK: <option>" or an error string.
    """
    label_json  = json.dumps(label_text)
    option_json = json.dumps(option_text)
    return f"{_SELECT_FN}\nawait selectByLabel({label_json}, {option_json});"


def build_select_many_script(selections: dict[str, str]) -> str:
    """
    Generate JS to select multiple combobox options in sequence.

    Args:
        selections: {label_text: option_text} — processed in order.

    Returns:
        Async JS string. Result is {label_text: "OK: <option>" | error} for each entry.
    """
    payload = json.dumps(selections, ensure_ascii=False, indent=2)
    return f"""{_SELECT_FN}

(async function() {{
    const selections = {payload};
    const results = {{}};
    for (const [label, option] of Object.entries(selections)) {{
        results[label] = await selectByLabel(label, option);
        // Small gap between selections so React can settle
        await new Promise(r => setTimeout(r, 150));
    }}
    return results;
}})();"""
