"""
PulseRelay Hospital Bed & ICU Capacity Service
================================================
Manages regional emergency hospital telemetry, trauma capabilities, ICU/ER bed availability,
and computes optimal hospital recommendations based on distance, bed capacity, and incident triage.
"""

from __future__ import annotations

import math
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Primary Trauma & Emergency Medical Centers Registry (Chennai Metro Region)
REGIONAL_HOSPITALS = [
    {
        "id": "HOSP-APOLLO-GREAMS",
        "name": "Apollo Main Hospital (Greams Road)",
        "address": "21 Greams Lane, Thousand Lights, Chennai",
        "latitude": 13.0604,
        "longitude": 80.2496,
        "phone": "+91 44 2829 0200",
        "trauma_level": "Level 1 Comprehensive Trauma Center",
        "capabilities": ["Advanced Cardiac Care", "Neuro ICU", "Severe Trauma", "Burn Unit"],
        "er_beds_total": 35,
        "er_beds_available": 12,
        "icu_beds_total": 50,
        "icu_beds_available": 8,
        "burn_beds_available": 3,
        "status": "OPERATIONAL",  # OPERATIONAL | NEAR_CAPACITY | OVER_CAPACITY
    },
    {
        "id": "HOSP-RGGGH-PARK",
        "name": "Rajiv Gandhi Govt General Hospital",
        "address": "EVR Periyar Salai, Park Town, Chennai",
        "latitude": 13.0815,
        "longitude": 80.2778,
        "phone": "+91 44 2530 5000",
        "trauma_level": "Level 1 Apex Government Trauma Center",
        "capabilities": ["24x7 Emergency Resuscitation", "Mass Casualty Unit", "Toxicology", "Burn Intensive Care"],
        "er_beds_total": 80,
        "er_beds_available": 28,
        "icu_beds_total": 100,
        "icu_beds_available": 19,
        "burn_beds_available": 7,
        "status": "OPERATIONAL",
    },
    {
        "id": "HOSP-FORTIS-ADYAR",
        "name": "Fortis Malar Hospital (Adyar)",
        "address": "52 First Main Rd, Gandhi Nagar, Adyar, Chennai",
        "latitude": 13.0067,
        "longitude": 80.2572,
        "phone": "+91 44 4289 2222",
        "trauma_level": "Level 2 Emergency Medical Center",
        "capabilities": ["Cardiac Resuscitation", "Stroke Unit", "General ER"],
        "er_beds_total": 15,
        "er_beds_available": 2,
        "icu_beds_total": 20,
        "icu_beds_available": 1,
        "burn_beds_available": 0,
        "status": "NEAR_CAPACITY",
    },
    {
        "id": "HOSP-SIMS-VADAPALANI",
        "name": "SIMS Hospital (Vadapalani)",
        "address": "1 Jawaharlal Nehru Salai, Vadapalani, Chennai",
        "latitude": 13.0500,
        "longitude": 80.2121,
        "phone": "+91 44 4959 4959",
        "trauma_level": "Level 1 Tertiary Emergency Center",
        "capabilities": ["Multi-Organ ICU", "Pediatric ER", "Polytrauma Unit"],
        "er_beds_total": 30,
        "er_beds_available": 14,
        "icu_beds_total": 40,
        "icu_beds_available": 11,
        "burn_beds_available": 4,
        "status": "OPERATIONAL",
    },
    {
        "id": "HOSP-MIOT-MANAPAKKAM",
        "name": "MIOT International Hospital",
        "address": "4/112 Mount-Poonamallee Rd, Manapakkam, Chennai",
        "latitude": 13.0234,
        "longitude": 80.1765,
        "phone": "+91 44 4200 2288",
        "trauma_level": "Level 1 Orthopedic & Trauma Speciality",
        "capabilities": ["Orthopedic Trauma", "Cardiothoracic Surgery", "ICU"],
        "er_beds_total": 40,
        "er_beds_available": 18,
        "icu_beds_total": 60,
        "icu_beds_available": 15,
        "burn_beds_available": 2,
        "status": "OPERATIONAL",
    },
]


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in miles between two latitude/longitude pairs."""
    R = 3958.8  # Earth radius in miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


class HospitalService:
    """Service to query hospital bed capacity and compute optimal routing recommendations."""

    @staticmethod
    def get_hospitals_matrix(
        latitude: Optional[float] = 13.0827,
        longitude: Optional[float] = 80.2707,
        chief_complaint: Optional[str] = "",
    ) -> List[Dict[str, Any]]:
        """
        Returns list of regional hospitals enriched with distance, ETA, and suitability score.
        """
        lat = latitude if latitude is not None else 13.0827
        lng = longitude if longitude is not None else 80.2707
        complaint_lower = (chief_complaint or "").lower()

        results = []
        for hosp in REGIONAL_HOSPITALS:
            item = dict(hosp)
            dist_miles = haversine_distance(lat, lng, item["latitude"], item["longitude"])
            # Estimate urban transit time (avg 25 mph urban ambulance speed)
            eta_mins = max(1, round((dist_miles / 25) * 60))

            item["distance_miles"] = dist_miles
            item["eta_minutes"] = eta_mins

            # Suitability Score (0-100) based on proximity, bed availability, and capability matching
            capacity_ratio = (item["er_beds_available"] + item["icu_beds_available"]) / (
                item["er_beds_total"] + item["icu_beds_total"]
            )
            score = 100 - (dist_miles * 8) + (capacity_ratio * 40)

            if "burn" in complaint_lower or "fire" in complaint_lower:
                if item["burn_beds_available"] > 0:
                    score += 25
            if "cardiac" in complaint_lower or "bleeding" in complaint_lower or "unresponsive" in complaint_lower:
                if item["icu_beds_available"] > 5:
                    score += 20

            item["suitability_score"] = max(10, min(99, round(score)))
            results.append(item)

        # Sort by highest suitability score
        results.sort(key=lambda x: x["suitability_score"], reverse=True)
        return results
