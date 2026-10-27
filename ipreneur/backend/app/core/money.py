"""Money in the founder's currency.

The intake form collects amounts in rupees or dollars. The intake keys still end
in `_usd` (arr_usd, cac_usd, …) because they predate the currency setting and
are stored on every project, so the currency travels beside them in
branding_data. A project saved before that setting existed has none, and its
figures were entered in dollars.
"""
from typing import Any, Literal, Mapping, Optional

Currency = Literal["INR", "USD"]

#: What a project with no currency recorded was entered in.
LEGACY_CURRENCY: Currency = "USD"


def currency_of(user_inputs: Optional[Mapping[str, Any]]) -> Currency:
    """The currency a project's figures are in."""
    c = str((user_inputs or {}).get("currency") or "").upper()
    return c if c in ("INR", "USD") else LEGACY_CURRENCY  # type: ignore[return-value]


def _indian_grouping(n: int) -> str:
    """12000000 -> "1,20,00,000": thousands, then pairs."""
    s = str(abs(n))
    if len(s) > 3:
        head, groups = s[:-3], [s[-3:]]
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        s = ",".join([head, *groups])
    return ("-" if n < 0 else "") + s


def short_inr(amount: float) -> str:
    """The way an Indian deck writes it: ₹1.2 Cr, ₹80 L, ₹45,000."""
    for size, unit in ((1e7, "Cr"), (1e5, "L")):
        if abs(amount) >= size:
            return f"₹{amount / size:.2f}".rstrip("0").rstrip(".") + f" {unit}"
    return "₹" + _indian_grouping(round(amount))


def format_money(amount: float, currency: Currency) -> str:
    """An exact founder figure for the prompt, with the short form alongside."""
    if currency == "INR":
        exact = "₹" + _indian_grouping(round(amount))
        return f"{exact} ({short_inr(amount)})" if abs(amount) >= 1e5 else exact
    return f"${amount:,.0f}"


CURRENCY_GUIDANCE: dict[str, str] = {
    "INR": (
        "CURRENCY — INDIAN RUPEES: every founder figure above is in ₹. Write money on "
        "the slides in ₹ using lakh and crore (₹80 L, ₹4.5 Cr) and never convert a "
        "founder figure to dollars. Third-party market figures keep the currency their "
        "source reports — do not invent an exchange rate."
    ),
    "USD": "CURRENCY — US DOLLARS: write money as $ with K/M/B (e.g. $2.4M).",
}
