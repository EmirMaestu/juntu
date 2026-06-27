import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from icalendar import Calendar
import calfeed


def _parse(b):
    return Calendar.from_ical(b)


def test_empty_is_valid():
    cal = _parse(calfeed.build_ics([], []))
    assert cal.get("version") == "2.0"
    assert len(list(cal.walk("VEVENT"))) == 0


def test_evento_renders_vevent():
    out = calfeed.build_ics(
        [{"id": 1, "title": "Cena con Ana", "starts_at": "2026-07-01T21:00",
          "location": "Casa", "notes": "traer vino"}], [])
    ev = list(_parse(out).walk("VEVENT"))[0]
    assert str(ev.get("summary")) == "Cena con Ana"
    assert str(ev.get("location")) == "Casa"
    assert str(ev.get("uid")) == "yumi-evento-1@yumi"
    dt = ev.get("dtstart").dt
    assert dt.hour == 21 and dt.tzinfo is not None
    assert (ev.get("dtend").dt - dt).seconds == 3600


def test_recordatorio_has_alarm():
    out = calfeed.build_ics([], [{"id": 5, "text": "Pagar luz",
                                  "remind_at": "2026-07-02 09:00", "recurrence": None}])
    ev = list(_parse(out).walk("VEVENT"))[0]
    assert str(ev.get("uid")) == "yumi-rec-5@yumi"
    assert len(list(ev.walk("VALARM"))) == 1


def test_recurrence_emits_rrule():
    out = calfeed.build_ics([], [{"id": 6, "text": "Pastilla",
                                  "remind_at": "2026-07-02T08:00", "recurrence": "daily"}])
    ev = list(_parse(out).walk("VEVENT"))[0]
    assert ev.get("rrule").get("FREQ") == ["DAILY"]


def test_broken_item_skipped():
    out = calfeed.build_ics([{"id": 9, "title": "sin fecha", "starts_at": None}], [])
    assert len(list(_parse(out).walk("VEVENT"))) == 0


def test_has_vtimezone():
    out = calfeed.build_ics([{"id": 1, "title": "x", "starts_at": "2026-07-01T21:00"}], [])
    assert len(list(_parse(out).walk("VTIMEZONE"))) >= 1


def test_escaping_roundtrips():
    out = calfeed.build_ics([{"id": 1, "title": "Pagar, urgente\nantes de las 5",
                              "starts_at": "2026-07-01T10:00"}], [])
    ev = list(_parse(out).walk("VEVENT"))[0]
    assert str(ev.get("summary")) == "Pagar, urgente\nantes de las 5"
