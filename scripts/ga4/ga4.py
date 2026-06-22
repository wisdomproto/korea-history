#!/usr/bin/env python3
"""Query GA4 (gcnote.co.kr) for behavioral metrics used in pricing/subscription decisions.

Auth: service account JSON at scripts/ga4/service-account.json (gitignored).
Property: numeric GA4 property id via env GA4_PROPERTY_ID or --property.

Reports:
  overview    headline metrics for a date range
  retention   new vs returning users (closest proxy to willingness-to-pay)
  timeseries  traffic over time (day/week/month) to see seasonality
  pages       top pages by views + avg engagement time
"""
import argparse
import os
import sys

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    OrderBy,
    RunReportRequest,
)
from google.oauth2 import service_account

KEY_PATH = os.path.join(os.path.dirname(__file__), "service-account.json")


def client():
    if not os.path.exists(KEY_PATH):
        sys.exit(f"[!] service-account.json not found at {KEY_PATH}\n    See README.md step A.")
    creds = service_account.Credentials.from_service_account_file(
        KEY_PATH, scopes=["https://www.googleapis.com/auth/analytics.readonly"]
    )
    return BetaAnalyticsDataClient(credentials=creds)


def property_id(args):
    pid = args.property or os.environ.get("GA4_PROPERTY_ID")
    if not pid:
        sys.exit("[!] Set GA4_PROPERTY_ID env or pass --property (numeric, NOT G-XXXX).")
    return pid.replace("properties/", "")


def run(args, dimensions, metrics, order_by=None, limit=None):
    req = RunReportRequest(
        property=f"properties/{property_id(args)}",
        date_ranges=[DateRange(start_date=args.start, end_date=args.end)],
        dimensions=[Dimension(name=d) for d in dimensions],
        metrics=[Metric(name=m) for m in metrics],
        order_bys=order_by or [],
        limit=limit,
    )
    return client().run_report(req)


def fmt_secs(s):
    s = float(s)
    return f"{int(s // 60)}m {int(s % 60)}s"


def report_overview(args):
    metrics = [
        "totalUsers", "newUsers", "sessions",
        "screenPageViews", "engagementRate",
        "averageSessionDuration", "userEngagementDuration",
        "screenPageViewsPerSession",
    ]
    resp = run(args, [], metrics)
    print(f"\n== 개요  {args.start} ~ {args.end} ==")
    if not resp.rows:
        print("  (데이터 없음)")
        return
    row = resp.rows[0].metric_values
    label = {
        "totalUsers": "총 사용자",
        "newUsers": "신규 사용자",
        "sessions": "세션",
        "screenPageViews": "페이지뷰",
        "engagementRate": "engagement rate",
        "averageSessionDuration": "평균 세션 시간",
        "userEngagementDuration": "총 참여 시간",
        "screenPageViewsPerSession": "세션당 페이지수",
    }
    for i, m in enumerate(metrics):
        v = row[i].value
        if m in ("averageSessionDuration", "userEngagementDuration"):
            v = fmt_secs(v)
        elif m == "engagementRate":
            v = f"{float(v) * 100:.1f}%"
        elif m in ("screenPageViewsPerSession",):
            v = f"{float(v):.2f}"
        else:
            v = f"{int(float(v)):,}"
        print(f"  {label[m]:<16} {v}")
    total = int(float(row[0].value)) or 1
    new = int(float(row[1].value))
    print(f"  {'재방문 비율':<16} {(total - new) / total * 100:.1f}%  (전체-신규 / 전체)")


def report_retention(args):
    resp = run(
        args, ["newVsReturning"],
        ["totalUsers", "sessions", "averageSessionDuration", "engagementRate", "screenPageViewsPerSession"],
    )
    print(f"\n== 신규 vs 재방문  {args.start} ~ {args.end} ==")
    print(f"  {'구분':<10}{'사용자':>10}{'세션':>10}{'평균체류':>12}{'참여율':>10}{'페이지/세션':>12}")
    for r in resp.rows:
        seg = r.dimension_values[0].value or "(미상)"
        seg_ko = {"new": "신규", "returning": "재방문"}.get(seg, seg)
        m = r.metric_values
        print(f"  {seg_ko:<10}{int(float(m[0].value)):>10,}{int(float(m[1].value)):>10,}"
              f"{fmt_secs(m[2].value):>12}{float(m[3].value)*100:>9.1f}%{float(m[4].value):>12.2f}")


def report_timeseries(args):
    gran = args.granularity
    dim = {"day": "date", "week": "yearWeek", "month": "yearMonth"}[gran]
    resp = run(
        args, [dim], ["totalUsers", "newUsers", "sessions", "averageSessionDuration"],
        order_by=[OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name=dim))],
    )
    print(f"\n== 시계열 ({gran})  {args.start} ~ {args.end} ==")
    print(f"  {'기간':<12}{'사용자':>10}{'신규':>10}{'세션':>10}{'평균체류':>12}")
    peak = 0
    for r in resp.rows:
        u = int(float(r.metric_values[0].value))
        peak = max(peak, u)
    for r in resp.rows:
        p = r.dimension_values[0].value
        m = r.metric_values
        u = int(float(m[0].value))
        bar = "#" * int(u / peak * 30) if peak else ""
        print(f"  {p:<12}{u:>10,}{int(float(m[1].value)):>10,}{int(float(m[2].value)):>10,}"
              f"{fmt_secs(m[3].value):>12}  {bar}")


def report_pages(args):
    resp = run(
        args, ["pagePath"],
        ["screenPageViews", "totalUsers", "userEngagementDuration"],
        order_by=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"), desc=True)],
        limit=args.limit,
    )
    print(f"\n== 페이지별  {args.start} ~ {args.end}  (상위 {args.limit}) ==")
    print(f"  {'경로':<42}{'뷰':>9}{'사용자':>9}{'참여/사용자':>14}")
    for r in resp.rows:
        path = r.dimension_values[0].value[:40]
        m = r.metric_values
        views = int(float(m[0].value))
        users = int(float(m[1].value)) or 1
        eng = float(m[2].value) / users
        print(f"  {path:<42}{views:>9,}{users:>9,}{fmt_secs(eng):>14}")


def main():
    p = argparse.ArgumentParser(description="GA4 query tool for gcnote.co.kr")
    p.add_argument("report", choices=["overview", "retention", "timeseries", "pages"])
    p.add_argument("--start", default="28daysAgo")
    p.add_argument("--end", default="yesterday")
    p.add_argument("--property", help="numeric GA4 property id (overrides GA4_PROPERTY_ID)")
    p.add_argument("--granularity", choices=["day", "week", "month"], default="day")
    p.add_argument("--limit", type=int, default=25)
    args = p.parse_args()

    {
        "overview": report_overview,
        "retention": report_retention,
        "timeseries": report_timeseries,
        "pages": report_pages,
    }[args.report](args)


if __name__ == "__main__":
    main()
