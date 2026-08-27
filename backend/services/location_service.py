"""
PulseRelay Location Resolver Service
======================================
Ensures location telemetry is ALWAYS available for dispatchers.

Combines 3 sources in order of priority:
1. Spoken / LLM-extracted location (e.g. "Highway 101 near Exit 42").
2. Browser GPS coordinates (high accuracy latitude/longitude).
3. IP-based Geolocation fallback (city, region, country, lat, lon).
"""

from __future__ import annotations

import json
import logging
import urllib.request
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class LocationService:
    """Service to resolve and enrich emergency location data."""

    @staticmethod
    def get_ip_location() -> Optional[Dict[str, any]]:
        """Fetch IP-based location fallback from ip-api.com."""
        try:
            url = "http://ip-api.com/json/?fields=status,message,country,regionName,city,lat,lon"
            req = urllib.request.Request(url, headers={"User-Agent": "PulseRelay/1.0"})
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("status") == "success":
                    return {
                        "latitude": float(data["lat"]),
                        "longitude": float(data["lon"]),
                        "city": data.get("city", ""),
                        "region": data.get("regionName", ""),
                        "country": data.get("country", ""),
                        "display_name": f"{data.get('city', '')}, {data.get('regionName', '')}, {data.get('country', '')}".strip(", "),
                    }
        except Exception as exc:
            logger.warning("IP Geolocation lookup failed: %s", exc)
        return None

    @classmethod
    def resolve_location(
        cls,
        extracted_location: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> Tuple[str, Optional[Dict[str, float]]]:
        """
        Resolve the best location string and GPS coordinates.

        Returns
        -------
        Tuple[str, Dict[str, float] | None]
            - location_string: Best human-readable location text.
            - gps_dict: Dict with 'latitude' and 'longitude' or None.
        """
        final_lat = latitude
        final_lng = longitude
        ip_info = None

        # If GPS coordinates not provided by browser, fetch IP location
        if final_lat is None or final_lng is None:
            ip_info = cls.get_ip_location()
            if ip_info:
                final_lat = ip_info["latitude"]
                final_lng = ip_info["longitude"]

        # Determine location text string
        if extracted_location and extracted_location.strip() and extracted_location.lower() != "none":
            location_text = extracted_location.strip()
        elif ip_info and ip_info.get("display_name"):
            location_text = f"Device Location: {ip_info['display_name']}"
        elif final_lat is not None and final_lng is not None:
            location_text = f"GPS Pin: {final_lat:.4f}, {final_lng:.4f}"
        else:
            location_text = "Location Pending Dispatch"

        gps_dict = None
        if final_lat is not None and final_lng is not None:
            gps_dict = {"latitude": final_lat, "longitude": final_lng}

        return location_text, gps_dict
