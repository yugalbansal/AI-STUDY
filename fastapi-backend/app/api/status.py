"""UptimeRobot Status Dashboard Backend API Endpoint"""

from fastapi import APIRouter, HTTPException
import httpx
import os
import time
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

router = APIRouter()
logger = logging.getLogger(__name__)

# UptimeRobot API V2 Endpoint
UPTIMEROBOT_URL = "https://api.uptimerobot.com/v2/getMonitors"

# In-memory cache to respect Free plan rate limit (10 requests per minute)
# Cache is valid for 60 seconds (1 minute) to allow quick updates for latency
CACHE_DURATION_SEC = 60
_status_cache: Dict[str, Any] = {
    "timestamp": 0.0,
    "data": None
}

# --- Pydantic Schemas for JSON Responses ---

class UptimePeriodStats(BaseModel):
    ratio: str = Field(..., description="Uptime ratio percentage")
    incidents: int = Field(..., description="Number of incidents in period")
    downtime: str = Field(..., description="Formatted downtime duration in period")

class UptimeStats(BaseModel):
    overall: str = Field(..., description="All time uptime percentage")
    last24h: UptimePeriodStats
    last7d: UptimePeriodStats
    last30d: UptimePeriodStats

class OperationalMetrics(BaseModel):
    averageResponseTime: float = Field(..., description="Average response time in milliseconds")
    currentResponseTime: float = Field(..., description="Current response time in milliseconds")
    lastCheckTime: str = Field(..., description="ISO timestamp of last check")
    lastCheckAgo: str = Field(..., description="Formatted last checked ago string")
    intervalMin: int = Field(..., description="Monitor interval in minutes")
    statusDuration: str = Field(..., description="Formatted duration in current state")
    mtbf: str = Field(..., description="Mean Time Between Failures")

class ResponseTimePoint(BaseModel):
    time: int = Field(..., description="Unix timestamp of check")
    value: int = Field(..., description="Response time in ms")

class Incident(BaseModel):
    date: str = Field(..., description="ISO timestamp of when the downtime started")
    duration: int = Field(..., description="Downtime duration in seconds")
    resolutionTime: str = Field(..., description="Human readable duration")
    status: str = Field(..., description="resolved or ongoing")
    reason: str = Field(..., description="Downtime reason or error details")

class UptimeBarTick(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD date")
    status: str = Field(..., description="up, down, degraded, paused, or unknown")

class MonitorDashboardData(BaseModel):
    id: int = Field(..., description="Monitor ID")
    name: str = Field(..., description="Friendly monitor name")
    url: str = Field(..., description="Monitored URL")
    status: str = Field(..., description="up, down, paused, or unknown")
    uptime: UptimeStats
    metrics: OperationalMetrics
    responseTimes: List[ResponseTimePoint] = Field(..., description="Last 24h response times for chart")
    incidents: List[Incident] = Field(..., description="Incident history")
    uptimeBars: List[UptimeBarTick] = Field(..., description="Last 30 days status bars")

class StatusDashboardResponse(BaseModel):
    success: bool
    monitors: List[MonitorDashboardData]


# --- Helper Functions ---

def map_monitor_status(status_code: int) -> str:
    """Map UptimeRobot numeric status to string status."""
    # 0 = paused, 1 = not checked, 2 = up, 8 = seems down, 9 = down
    if status_code == 2:
        return "up"
    elif status_code in (8, 9):
        return "down"
    elif status_code == 0:
        return "paused"
    else:
        return "unknown"


def format_duration(seconds: int) -> str:
    """Format duration in seconds to a human-readable string (long version)."""
    if seconds <= 0:
        return "Ongoing"
    
    minutes = seconds // 60
    if minutes < 1:
        return f"{seconds}s"
    
    hours = minutes // 60
    remaining_minutes = minutes % 60
    
    if hours < 1:
        return f"{minutes}m {seconds % 60}s"
    
    days = hours // 24
    remaining_hours = hours % 24
    
    if days < 1:
        return f"{hours}h {remaining_minutes}m {seconds % 60}s"
    else:
        return f"{days}d {remaining_hours}h {remaining_minutes}m"


def format_duration_short(seconds: int) -> str:
    """Format duration in seconds to a short human-readable string (e.g. 10m 52s)."""
    if seconds <= 0:
        return "0s"
    
    minutes = seconds // 60
    remaining_seconds = seconds % 60
    
    if minutes < 1:
        return f"{seconds}s"
    
    hours = minutes // 60
    remaining_minutes = minutes % 60
    
    if hours < 1:
        if remaining_seconds > 0:
            return f"{minutes}m, {remaining_seconds}s"
        return f"{minutes}m"
    
    days = hours // 24
    remaining_hours = hours % 24
    
    if days < 1:
        if remaining_minutes > 0:
            return f"{hours}h, {remaining_minutes}m"
        return f"{hours}h"
    else:
        if remaining_hours > 0:
            return f"{days}d, {remaining_hours}h"
        return f"{days}d"


def get_period_stats(logs: List[Dict[str, Any]], seconds: int, current_time: float) -> Dict[str, Any]:
    """Calculate the incident count and downtime duration in the last X seconds."""
    since_time = current_time - seconds
    period_logs = [log for log in logs if log.get("datetime", 0) >= since_time]
    down_logs = [log for log in period_logs if log.get("type") == 1]
    
    incidents_count = len(down_logs)
    total_downtime = sum(log.get("duration", 0) for log in down_logs)
    
    # Format downtime string
    if total_downtime == 0:
        downtime_str = "0 incidents, 0m down"
    else:
        incidents_label = "incident" if incidents_count == 1 else "incidents"
        downtime_str = f"{incidents_count} {incidents_label}, {format_duration_short(total_downtime)} down"
        
    return {
        "incidents": incidents_count,
        "downtime": downtime_str,
        "raw_downtime_sec": total_downtime
    }


def calculate_mtbf(logs: List[Dict[str, Any]], current_time: float) -> str:
    """
    Calculate MTBF (Mean Time Between Failures) over the last 30 days.
    MTBF = Total Uptime / Number of Failures
    """
    thirty_days_ago = current_time - (30 * 86400)
    
    # Filter logs to the last 30 days
    recent_logs = [log for log in logs if log.get("datetime", 0) >= thirty_days_ago]
    down_logs = [log for log in recent_logs if log.get("type") == 1]
    
    if not down_logs:
        return "No incidents"
    
    # Sum the duration of failures in the last 30 days
    total_downtime = sum(log.get("duration", 0) for log in down_logs)
    total_time = 30 * 86400
    
    total_uptime = total_time - total_downtime
    if total_uptime < 0:
        total_uptime = 0
        
    failures_count = len(down_logs)
    mtbf_seconds = total_uptime / failures_count
    
    return format_duration_short(int(mtbf_seconds))


def generate_uptime_bars(logs: List[Dict[str, Any]], current_status: str, current_time: float) -> List[Dict[str, Any]]:
    """
    Generate status bars for the last 30 days.
    Returns list of dicts: {"date": "YYYY-MM-DD", "status": "up"|"down"|"degraded"|"paused"|"unknown"}
    """
    bars = []
    
    # Generate days from 29 days ago up to today (index 0 is 29 days ago, index 29 is today)
    for day_offset in range(29, -1, -1):
        day_timestamp = current_time - (day_offset * 86400)
        day_date = datetime.fromtimestamp(day_timestamp, tz=timezone.utc)
        date_str = day_date.strftime("%Y-%m-%d")
        
        start_of_day = int(day_date.replace(hour=0, minute=0, second=0, microsecond=0).timestamp())
        end_of_day = int(day_date.replace(hour=23, minute=59, second=59, microsecond=0).timestamp())
        
        # Find logs within this day
        day_logs = [log for log in logs if start_of_day <= log.get("datetime", 0) <= end_of_day]
        
        if day_logs:
            # If there was a downtime log on this day
            down_logs = [log for log in day_logs if log.get("type") == 1]
            paused_logs = [log for log in day_logs if log.get("type") == 99]
            
            if down_logs:
                # Sum downtime on this day
                day_downtime = sum(log.get("duration", 0) for log in down_logs)
                if day_downtime >= 80000: # Mostly down
                    day_status = "down"
                else:
                    day_status = "degraded"
            elif paused_logs:
                day_status = "paused"
            else:
                day_status = "up"
        else:
            # No logs on this day, look for the state prior to this day
            prior_logs = [log for log in logs if log.get("datetime", 0) < start_of_day]
            if prior_logs:
                # Get the most recent log prior to this day
                latest_prior_log = max(prior_logs, key=lambda x: x.get("datetime", 0))
                prior_type = latest_prior_log.get("type")
                if prior_type == 1: # Down
                    day_status = "down"
                elif prior_type == 99: # Paused
                    day_status = "paused"
                else:
                    day_status = "up"
            else:
                # No logs ever before this day: default to the monitor's current status if it's "paused", else "up"
                day_status = "paused" if current_status == "paused" else "up"
                
        bars.append({"date": date_str, "status": day_status})
        
    return bars


def transform_monitor_data(mon: Dict[str, Any], current_time: float) -> Dict[str, Any]:
    """Transform the raw UptimeRobot monitor data into dashboard-friendly structure."""
    
    # 1. Base Info
    monitor_id = mon.get("id", 0)
    name = mon.get("friendly_name", "Unknown Monitor")
    url = mon.get("url", "")
    raw_status = mon.get("status", 1)
    status_str = map_monitor_status(raw_status)
    interval_sec = mon.get("interval", 300)
    interval_min = interval_sec // 60
    
    # 2. Logs History
    raw_logs = mon.get("logs", [])
    # Sort logs descending (newest first)
    sorted_logs = sorted(raw_logs, key=lambda x: x.get("datetime", 0), reverse=True)
    
    # Calculate current state duration (e.g. "Currently up for 3h 59m 14s")
    status_duration_str = "N/A"
    if sorted_logs:
        latest_log = sorted_logs[0]
        state_duration_sec = int(current_time) - latest_log.get("datetime", 0)
        state_duration_formatted = format_duration(state_duration_sec)
        
        if latest_log.get("type") == 2: # Went Up
            status_duration_str = f"Currently up for {state_duration_formatted}"
        elif latest_log.get("type") == 1: # Went Down
            status_duration_str = f"Currently down for {state_duration_formatted}"
        elif latest_log.get("type") == 99: # Paused
            status_duration_str = f"Paused for {state_duration_formatted}"
        else:
            status_duration_str = f"Active for {state_duration_formatted}"
    else:
        # Fallback if no logs are available
        status_duration_str = "Currently up" if status_str == "up" else "Currently offline"
        
    # Calculate period stats from logs
    stats_24h = get_period_stats(raw_logs, 24 * 3600, current_time)
    stats_7d = get_period_stats(raw_logs, 7 * 24 * 3600, current_time)
    stats_30d = get_period_stats(raw_logs, 30 * 24 * 3600, current_time)
    
    # 3. Uptime Ratios
    # custom_uptime_ratios corresponds to "1-7-30" days
    ratios_str = mon.get("custom_uptime_ratios", "")
    ratios_list = ratios_str.split("-") if ratios_str else []
    
    uptime_stats = {
        "overall": mon.get("all_time_uptime_ratio", "100.00"),
        "last24h": {
            "ratio": ratios_list[0] if len(ratios_list) > 0 else "100.00",
            "incidents": stats_24h["incidents"],
            "downtime": stats_24h["downtime"]
        },
        "last7d": {
            "ratio": ratios_list[1] if len(ratios_list) > 1 else "100.00",
            "incidents": stats_7d["incidents"],
            "downtime": stats_7d["downtime"]
        },
        "last30d": {
            "ratio": ratios_list[2] if len(ratios_list) > 2 else "100.00",
            "incidents": stats_30d["incidents"],
            "downtime": stats_30d["downtime"]
        }
    }
    
    # 4. Response Times History (Charts) - UptimeRobot JSON field is `response_times`
    raw_response_times = mon.get("response_times", [])
    response_times = []
    
    # Ensure they are sorted by datetime ascending
    sorted_resp_times = sorted(raw_response_times, key=lambda x: x.get("datetime", 0))
    for pt in sorted_resp_times:
        response_times.append({
            "time": pt.get("datetime", 0),
            "value": pt.get("value", 0)
        })
        
    # Get current and average response times
    current_response_time = response_times[-1]["value"] if response_times else 0
    avg_resp_time_str = mon.get("average_response_time", "0.0")
    try:
        average_response_time = float(avg_resp_time_str)
    except ValueError:
        average_response_time = 0.0
        
    # Last check duration calculation (e.g. "49s ago")
    last_check_ago_str = "N/A"
    if response_times:
        last_check_ts = response_times[-1]["time"]
        last_check_str = datetime.fromtimestamp(last_check_ts, tz=timezone.utc).isoformat()
        
        diff_sec = int(current_time) - last_check_ts
        if diff_sec < 60:
            last_check_ago_str = f"{diff_sec}s ago"
        elif diff_sec < 3600:
            last_check_ago_str = f"{diff_sec // 60}m {diff_sec % 60}s ago"
        else:
            last_check_ago_str = f"{diff_sec // 3600}h {(diff_sec % 3600) // 60}m ago"
    else:
        last_check_str = datetime.fromtimestamp(current_time, tz=timezone.utc).isoformat()
        last_check_ago_str = "Just now"
        
    # 5. Incident History & MTBF
    incidents = []
    for log in sorted_logs:
        log_type = log.get("type", 0)
        # Type 1 is Down
        if log_type == 1:
            log_dt = log.get("datetime", 0)
            duration_sec = log.get("duration", 0)
            reason = log.get("reason", {}).get("detail", "Connection issue") if isinstance(log.get("reason"), dict) else str(log.get("reason") or "Connection issue")
            
            incidents.append({
                "date": datetime.fromtimestamp(log_dt, tz=timezone.utc).isoformat(),
                "duration": duration_sec,
                "resolutionTime": format_duration_short(duration_sec) if duration_sec > 0 else "Ongoing",
                "status": "resolved" if duration_sec > 0 else "ongoing",
                "reason": reason
            })
            
    # Calculate MTBF
    mtbf_str = calculate_mtbf(raw_logs, current_time)
    
    # 6. Uptime Bars
    uptime_bars = generate_uptime_bars(raw_logs, status_str, current_time)
    
    return {
        "id": monitor_id,
        "name": name,
        "url": url,
        "status": status_str,
        "uptime": uptime_stats,
        "metrics": {
            "averageResponseTime": average_response_time,
            "currentResponseTime": current_response_time,
            "lastCheckTime": last_check_str,
            "lastCheckAgo": last_check_ago_str,
            "intervalMin": interval_min,
            "statusDuration": status_duration_str,
            "mtbf": mtbf_str
        },
        "responseTimes": response_times,
        "incidents": incidents,
        "uptimeBars": uptime_bars
    }


# --- API Endpoint ---

@router.get("/status", response_model=StatusDashboardResponse)
async def get_status_dashboard():
    """
    Fetch and transform UptimeRobot monitors into a dashboard-friendly format.
    Includes current status, uptime percentages, response time charts, incident logs,
    and 30-day status bars.
    """
    current_time = time.time()
    
    # Check simple cache
    if _status_cache["data"] is not None and (current_time - _status_cache["timestamp"]) < CACHE_DURATION_SEC:
        logger.info("Returning status dashboard data from cache")
        return _status_cache["data"]
        
    api_key = os.getenv("UPTIMEROBOT_API_KEY")
    if not api_key:
        logger.error("UPTIMEROBOT_API_KEY environment variable is not set")
        raise HTTPException(
            status_code=500, 
            detail="UptimeRobot API key is not configured on the backend server."
        )
        
    try:
        # Prepare request payload for getMonitors
        # Need: logs=1, responseTimes=1, customUptimeRatios=1-7-30
        payload = {
            "api_key": api_key,
            "format": "json",
            "logs": 1,
            "response_times": 1,
            "custom_uptime_ratios": "1-7-30"
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            logger.info("Calling UptimeRobot API...")
            response = await client.post(
                UPTIMEROBOT_URL,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
        if response.status_code != 200:
            logger.error(f"UptimeRobot API returned status {response.status_code}: {response.text}")
            raise HTTPException(
                status_code=502,
                detail=f"UptimeRobot API request failed with status code {response.status_code}"
            )
            
        res_data = response.json()
        
        if res_data.get("stat") != "ok":
            error_detail = res_data.get("error", {}).get("message", "Unknown error")
            logger.error(f"UptimeRobot API error: {error_detail}")
            raise HTTPException(
                status_code=502,
                detail=f"UptimeRobot API error: {error_detail}"
            )
            
        monitors_raw = res_data.get("monitors", [])
        
        # Transform monitors
        transformed_monitors = []
        for mon in monitors_raw:
            try:
                transformed = transform_monitor_data(mon, current_time)
                transformed_monitors.append(transformed)
            except Exception as e:
                logger.error(f"Error transforming monitor data for monitor {mon.get('id')}: {e}", exc_info=True)
                # Keep going to process other monitors if one fails
                continue
                
        result = {
            "success": True,
            "monitors": transformed_monitors
        }
        
        # Store in cache
        _status_cache["timestamp"] = current_time
        _status_cache["data"] = result
        
        return result
        
    except httpx.RequestError as exc:
        logger.error(f"HTTP request to UptimeRobot failed: {exc}")
        raise HTTPException(
            status_code=503,
            detail=f"Failed to communicate with UptimeRobot: {str(exc)}"
        )
    except Exception as exc:
        logger.error(f"Unexpected error in status dashboard: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred while fetching system status: {str(exc)}"
        )
