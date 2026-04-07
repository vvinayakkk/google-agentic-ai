"""Analytics request/response schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class MetricPoint(BaseModel):
    """Simple time-series point."""

    date: str
    value: float


class InsightCard(BaseModel):
    """Single admin insight card."""

    title: str
    value: float | int | str
    delta: float | None = None
    trend: str = Field(default="neutral")
    context: str = Field(default="")


class AdminInsightOverview(BaseModel):
    """Top-level admin analytics overview."""

    model_config = ConfigDict(strict=True)

    window_days: int
    generated_at: str
    scorecard: list[InsightCard]
    growth_trends: dict
    engagement: dict
    operational_health: dict
    market_intelligence: dict
    opportunities: dict
    visualizations: dict = Field(default_factory=dict)
    recommendations: list[str]


class FarmerInsightSummary(BaseModel):
    """Per-farmer analytics summary payload."""

    model_config = ConfigDict(strict=True)

    farmer_id: str
    generated_at: str
    totals: dict
    activity: dict
    benchmarks: dict
    equipment: dict = Field(default_factory=dict)
    recommendations: list[str]
