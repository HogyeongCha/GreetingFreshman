#!/usr/bin/env python3
import csv
from pathlib import Path


SOURCE = Path("exports/신청내역.csv")
TARGET = Path("exports/confirmed_sms_targets.csv")
MESSAGE = (
    "안녕하세요. 신청이 정상적으로 완료되어 해당 자리로 우선 배치될 예정입니다. "
    "따로 구글폼으로 다시 신청하실 필요는 없으며, 신청 완료되셨음을 안내드립니다. 감사합니다."
)


def normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) == 10 and digits.startswith("10"):
        return f"0{digits}"
    return digits


with SOURCE.open(newline="", encoding="utf-8-sig") as infile:
    rows = list(csv.DictReader(infile))

confirmed = [row for row in rows if (row.get("status") or "").strip() == "CONFIRMED"]

with TARGET.open("w", newline="", encoding="utf-8-sig") as outfile:
    writer = csv.DictWriter(
        outfile,
        fieldnames=["name", "phone", "seat_code", "message"],
    )
    writer.writeheader()
    for row in confirmed:
        writer.writerow(
            {
                "name": (row.get("name") or "").strip(),
                "phone": normalize_phone(row.get("phone") or ""),
                "seat_code": (row.get("seat_code") or "").strip(),
                "message": MESSAGE,
            }
        )

print(f"exported {len(confirmed)} rows to {TARGET}")
