import React from "react";
import type { ContentHealthReport } from "@/lib/diagnostics/content-health";

export function ContentHealthDiagnosticPanel({ report }: { report: ContentHealthReport }) {
  const isHealthy = report.status === "healthy";

  return (
    <div
      style={{
        background: "#ffffff",
        border: `1px solid ${isHealthy ? "#22c55e" : "#eab308"}`,
        borderRadius: 8,
        padding: "20px 24px",
        marginBottom: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
      data-testid="jd-content-health-diagnostic"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: isHealthy ? "#16a34a" : "#ca8a04",
                display: "inline-block",
              }}
            />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
              Content Availability & Editorial Pipeline Diagnostic
            </h2>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Production Reader Experience Truth Audit (Generated: {new Date(report.timestamp).toLocaleTimeString()})
          </p>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            padding: "4px 10px",
            borderRadius: 4,
            background: isHealthy ? "#dcfce7" : "#fef9c3",
            color: isHealthy ? "#15803d" : "#854d0e",
          }}
        >
          {report.status.toUpperCase()}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {/* Taza Feed Health */}
        <div style={{ background: "#f8fafc", padding: 14, borderRadius: 6, border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#1e293b", textTransform: "uppercase" }}>
            Taza (Latest Feed)
          </h3>
          <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
            <div>
              <strong>Eligible Stories:</strong> <span style={{ color: "#0284c7", fontWeight: 700 }}>{report.taza.eligibleStoryCount}</span>
            </div>
            <div>
              <strong>Newest Published:</strong> {report.taza.newestPublishedIst || "N/A"}
            </div>
            <div>
              <strong>Oldest Visible:</strong> {report.taza.oldestPublishedIst || "N/A"}
            </div>
          </div>
        </div>

        {/* 6 Canonical Home Sections */}
        <div style={{ background: "#f8fafc", padding: 14, borderRadius: 6, border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#1e293b", textTransform: "uppercase" }}>
            Home 6 Canonical Sections
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12.5 }}>
            <div>राजनीति: <strong>{report.homeSections.politics}</strong></div>
            <div>अपराध: <strong>{report.homeSections.crime}</strong></div>
            <div>राष्ट्रीय: <strong>{report.homeSections.national}</strong></div>
            <div>अंतरराष्ट्रीय: <strong>{report.homeSections.international}</strong></div>
            <div>मनोरंजन: <strong>{report.homeSections.entertainment}</strong></div>
            <div>खेल: <strong>{report.homeSections.sports}</strong></div>
          </div>
        </div>

        {/* My Jila Regional Feeds */}
        <div style={{ background: "#f8fafc", padding: 14, borderRadius: 6, border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#1e293b", textTransform: "uppercase" }}>
            My Jila (Districts)
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12.5 }}>
            <div>दुर्ग (Durg): <strong style={{ color: report.districts.durg > 0 ? "#16a34a" : "#dc2626" }}>{report.districts.durg}</strong></div>
            <div>रायपुर (Raipur): <strong>{report.districts.raipur}</strong></div>
            <div>बिलासपुर (Bilaspur): <strong>{report.districts.bilaspur}</strong></div>
            <div>बस्तर (Bastar): <strong>{report.districts.bastar}</strong></div>
            <div>राजनांदगांव: <strong>{report.districts.rajnandgaon}</strong></div>
            <div>कोरबा (Korba): <strong>{report.districts.korba}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
