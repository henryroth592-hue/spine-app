import { NextRequest, NextResponse } from "next/server";

export interface GiaLookupResult {
  reportNumber: string;
  reportDate: string | null;
  reportType: string | null;
  shape: string | null;
  caratWeight: string | null;
  color: string | null;
  clarity: string | null;
  cut: string | null;
  polish: string | null;
  symmetry: string | null;
  fluorescence: string | null;
  measurements: string | null;
}

const GIA_ENDPOINT = "https://api.reportresults.gia.edu/";

const QUERY = `
query LookupReport($reportNumber: String!) {
  getReport(report_number: $reportNumber) {
    report_date
    report_number
    report_type
    results {
      ... on DiamondGradingReportResults {
        shape_and_cutting_style
        carat_weight
        color_grade
        clarity_grade
        cut_grade
        polish
        symmetry
        fluorescence
        measurements
      }
    }
  }
}`;

export async function POST(req: NextRequest) {
  const giaKey = process.env.GIA_API_KEY;
  if (!giaKey) {
    return NextResponse.json({ error: "GIA_API_KEY not configured" }, { status: 500 });
  }

  const { reportNumber } = await req.json();
  if (!reportNumber?.trim()) {
    return NextResponse.json({ error: "Report number required" }, { status: 400 });
  }

  try {
    const res = await fetch(GIA_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": giaKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { reportNumber: reportNumber.trim() },
      }),
    });

    const json = await res.json();

    // GIA always returns 200 — check for errors in body
    if (json.errors?.length) {
      const msg = json.errors[0]?.message ?? "Report not found";
      return NextResponse.json({ error: msg }, { status: 404 });
    }

    const report = json.data?.getReport;
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const r = report.results ?? {};
    const result: GiaLookupResult = {
      reportNumber:  report.report_number,
      reportDate:    report.report_date    ?? null,
      reportType:    report.report_type    ?? null,
      shape:         r.shape_and_cutting_style ?? null,
      caratWeight:   r.carat_weight        ?? null,
      color:         r.color_grade         ?? null,
      clarity:       r.clarity_grade       ?? null,
      cut:           r.cut_grade           ?? null,
      polish:        r.polish              ?? null,
      symmetry:      r.symmetry            ?? null,
      fluorescence:  r.fluorescence        ?? null,
      measurements:  r.measurements        ?? null,
    };

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
