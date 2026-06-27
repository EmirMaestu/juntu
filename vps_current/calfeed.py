"""Generador de feed iCalendar (.ics) para Yumi. Módulo puro (sin DB), testeable."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from icalendar import Calendar, Event, Alarm

_FREQ = {"daily": "DAILY", "weekly": "WEEKLY", "monthly": "MONTHLY"}


def _parse_local(s, tz):
    """Parsea 'YYYY-MM-DDTHH:MM[:SS]' o 'YYYY-MM-DD HH:MM' (naive) como hora local tz. None si no se puede."""
    if not s:
        return None
    s = str(s).strip().replace(" ", "T")
    for length, fmt in ((19, "%Y-%m-%dT%H:%M:%S"), (16, "%Y-%m-%dT%H:%M"), (10, "%Y-%m-%d")):
        try:
            return datetime.strptime(s[:length], fmt).replace(tzinfo=tz)
        except ValueError:
            continue
    return None


def build_ics(eventos, recordatorios, tzname="America/Argentina/Buenos_Aires"):
    """Devuelve bytes (UTF-8) de un VCALENDAR con los eventos y recordatorios dados.
    eventos: dicts {id, title, starts_at, location, notes}
    recordatorios: dicts {id, text, remind_at, recurrence}"""
    tz = ZoneInfo(tzname)
    cal = Calendar()
    cal.add("prodid", "-//Yumi//Calendar Feed//ES")
    cal.add("version", "2.0")
    cal.add("calscale", "GREGORIAN")
    cal.add("method", "PUBLISH")
    cal["x-wr-calname"] = "Yumi"
    cal["x-wr-timezone"] = tzname

    for e in (eventos or []):
        start = _parse_local(e.get("starts_at"), tz)
        if not start:
            continue
        ev = Event()
        ev.add("uid", f"yumi-evento-{e['id']}@yumi")
        ev.add("summary", e.get("title") or "Evento")
        ev.add("dtstart", start)
        ev.add("dtend", start + timedelta(hours=1))
        if e.get("location"):
            ev.add("location", e["location"])
        if e.get("notes"):
            ev.add("description", e["notes"])
        cal.add_component(ev)

    for r in (recordatorios or []):
        start = _parse_local(r.get("remind_at"), tz)
        if not start:
            continue
        ev = Event()
        ev.add("uid", f"yumi-rec-{r['id']}@yumi")
        ev.add("summary", r.get("text") or "Recordatorio")
        ev.add("dtstart", start)
        ev.add("dtend", start + timedelta(minutes=30))
        freq = _FREQ.get((r.get("recurrence") or "").strip().lower())
        if freq:
            ev.add("rrule", {"freq": [freq]})
        alarm = Alarm()
        alarm.add("action", "DISPLAY")
        alarm.add("description", r.get("text") or "Recordatorio")
        alarm.add("trigger", timedelta(0))
        ev.add_component(alarm)
        cal.add_component(ev)

    try:
        cal.add_missing_timezones()  # agrega VTIMEZONE de Buenos Aires
    except Exception:
        pass
    return cal.to_ical()
