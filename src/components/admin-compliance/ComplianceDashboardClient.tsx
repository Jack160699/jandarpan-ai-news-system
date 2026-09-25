"use client";

import { useState } from "react";
import Link from "next/link";
import { CANONICAL_IDENTITY } from "@/lib/compliance/canonical-identity";
import { calculateGrievanceSla, type GrievanceStatus } from "@/lib/compliance/types";
import type { ComplianceHealthReport } from "@/lib/compliance/health-check";
import type { Rule18PublisherParticulars } from "@/lib/compliance/rule18";

type Props = {
  initialGrievances: any[];
  initialReports: any[];
  initialHealth: ComplianceHealthReport;
  rule18Data: Rule18PublisherParticulars;
};

export function ComplianceDashboardClient({
  initialGrievances,
  initialReports,
  initialHealth,
  rule18Data,
}: Props) {
  const [grievances, setGrievances] = useState(initialGrievances);
  const [reports, setReports] = useState(initialReports);
  const [health, setHealth] = useState(initialHealth);
  const [activeTab, setActiveTab] = useState<"grievances" | "reports" | "rule18" | "health">("grievances");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState<any | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [decisionType, setDecisionType] = useState("RESOLVED");
  const [reviewerName, setReviewerName] = useState<string>(CANONICAL_IDENTITY.grievanceOfficer.name);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  }

  async function handleRefreshHealth() {
    try {
      const res = await fetch("/api/compliance/health");
      const json = await res.json();
      if (json.ok) {
        setHealth(json.report);
        showToast("Compliance health checks updated successfully.");
      }
    } catch {
      showToast("Failed to refresh health checks.");
    }
  }

  async function handleGenerateReport(month: string) {
    setIsGeneratingReport(true);
    try {
      const res = await fetch("/api/compliance/monthly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", month }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast(`Draft compliance report for ${month} generated.`);
        // Refresh reports list
        const listRes = await fetch("/api/compliance/monthly-report");
        const listJson = await listRes.json();
        if (listJson.ok) setReports(listJson.reports);
      } else {
        showToast(json.error || "Failed to generate report.");
      }
    } catch {
      showToast("Network error generating monthly report.");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function handleApproveAndPublish(month: string) {
    const confirmed = window.confirm(
      `STATUTORY CONFIRMATION:\nAre you sure you want to approve and publish the compliance disclosure for ${month}?\n\nThis will make the privacy-safe aggregate data visible on the public website at https://www.jandarpan.news/compliance/${month} in satisfaction of Rule 19.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/compliance/monthly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_and_publish",
          month,
          approvedBy: reviewerName,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast(`Report for ${month} published to public compliance archive.`);
        const listRes = await fetch("/api/compliance/monthly-report");
        const listJson = await listRes.json();
        if (listJson.ok) setReports(listJson.reports);
      } else {
        showToast(json.error || "Approval failed.");
      }
    } catch {
      showToast("Error publishing compliance report.");
    }
  }

  async function handleSaveGrievanceDecision(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGrievance) return;
    setIsSubmittingDecision(true);

    try {
      // Direct API update
      const res = await fetch("/api/compliance/grievance-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grievanceId: selectedGrievance.id,
          decision: decisionType,
          decisionNotes,
          reviewer: reviewerName,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast(`Decision recorded for ${selectedGrievance.id}`);
        // Update local state
        setGrievances((prev) =>
          prev.map((g) =>
            g.id === selectedGrievance.id
              ? {
                  ...g,
                  status: decisionType,
                  decision: decisionType,
                  decision_notes: decisionNotes,
                  assigned_reviewer: reviewerName,
                  decision_at: new Date().toISOString(),
                }
              : g
          )
        );
        setSelectedGrievance(null);
      } else {
        showToast(json.error || "Failed to record decision.");
      }
    } catch {
      showToast("Network error recording decision.");
    } finally {
      setIsSubmittingDecision(false);
    }
  }

  const filteredGrievances = grievances.filter((g) => {
    if (filterStatus === "ALL") return true;
    if (filterStatus === "ACTIVE") return !["RESOLVED", "REJECTED_WITH_REASON"].includes(g.status);
    if (filterStatus === "RESOLVED") return ["RESOLVED", "REJECTED_WITH_REASON"].includes(g.status);
    return g.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-stone-900 text-white px-4 py-3 text-xs font-semibold shadow-xl border border-stone-700 animate-fade-in flex items-center gap-2">
          <span>ℹ️</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner: Statutory Framework */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/90 p-5 text-stone-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-950 text-red-400 border border-red-800">
                Part III · Digital News Ethics & Grievance Architecture
              </span>
              <span className="text-xs text-stone-400">MIB Rules Updated 2026</span>
            </div>
            <h1 className="m-0 text-xl font-bold text-stone-100">
              Statutory Compliance & Grievance Control Centre
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Publisher: <strong>{CANONICAL_IDENTITY.legalEntity.legalName}</strong> (CIN: {CANONICAL_IDENTITY.legalEntity.cin}) · Grievance Officer: <strong>{CANONICAL_IDENTITY.grievanceOfficer.name}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefreshHealth}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors"
            >
              Run Compliance Health Check
            </button>
            <Link
              href="/compliance"
              target="_blank"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors inline-flex items-center gap-1"
            >
              <span>Public Disclosures</span>
              <span>↗</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-xl border border-stone-800 bg-stone-900/60">
          <span className="text-stone-400 block font-semibold">Total Grievances</span>
          <span className="text-2xl font-extrabold text-stone-100 block mt-1">{grievances.length}</span>
          <span className="text-[11px] text-stone-500 mt-0.5 block">Level-I Registered Intake</span>
        </div>

        <div className="p-4 rounded-xl border border-stone-800 bg-stone-900/60">
          <span className="text-stone-400 block font-semibold">Active Review (15d SLA)</span>
          <span className="text-2xl font-extrabold text-amber-400 block mt-1">
            {grievances.filter((g) => !["RESOLVED", "REJECTED_WITH_REASON"].includes(g.status)).length}
          </span>
          <span className="text-[11px] text-amber-500/80 mt-0.5 block">Under Statutory Review</span>
        </div>

        <div className="p-4 rounded-xl border border-stone-800 bg-stone-900/60">
          <span className="text-stone-400 block font-semibold">Resolved / Closed</span>
          <span className="text-2xl font-extrabold text-green-400 block mt-1">
            {grievances.filter((g) => ["RESOLVED", "REJECTED_WITH_REASON"].includes(g.status)).length}
          </span>
          <span className="text-[11px] text-green-500/80 mt-0.5 block">With formal written decision</span>
        </div>

        <div className="p-4 rounded-xl border border-stone-800 bg-stone-900/60">
          <span className="text-stone-400 block font-semibold">Overall System Health</span>
          <span className={`text-2xl font-extrabold block mt-1 ${health.overallStatus === "GREEN" ? "text-green-400" : health.overallStatus === "YELLOW" ? "text-amber-400" : "text-red-400"}`}>
            {health.overallStatus}
          </span>
          <span className="text-[11px] text-stone-500 mt-0.5 block">
            {health.summary.passed}/{health.summary.totalChecks} Checks Verified
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-stone-800 space-x-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("grievances")}
          className={`px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === "grievances"
              ? "border-red-500 text-red-400"
              : "border-transparent text-stone-400 hover:text-stone-200"
          }`}
        >
          Grievance Ticketing & SLA ({grievances.length})
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === "reports"
              ? "border-red-500 text-red-400"
              : "border-transparent text-stone-400 hover:text-stone-200"
          }`}
        >
          Monthly Disclosures (Rule 19)
        </button>
        <button
          onClick={() => setActiveTab("rule18")}
          className={`px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === "rule18"
              ? "border-red-500 text-red-400"
              : "border-transparent text-stone-400 hover:text-stone-200"
          }`}
        >
          Rule 18 Publisher Information
        </button>
        <button
          onClick={() => setActiveTab("health")}
          className={`px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === "health"
              ? "border-red-500 text-red-400"
              : "border-transparent text-stone-400 hover:text-stone-200"
          }`}
        >
          Automated Health Checks ({health.summary.passed}/{health.summary.totalChecks})
        </button>
      </div>

      {/* Tab 1: Grievance Queue */}
      {activeTab === "grievances" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-400 font-semibold">Filter:</span>
              {["ALL", "ACTIVE", "RESOLVED"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    filterStatus === f
                      ? "bg-stone-100 text-stone-900"
                      : "bg-stone-800 text-stone-400 hover:text-stone-200"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <Link
              href="/grievance-redressal"
              target="_blank"
              className="text-xs font-semibold text-red-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Test Public Web Grievance Form</span>
              <span>↗</span>
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-900/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 border-b border-stone-800 font-bold uppercase tracking-wider text-stone-400">
                <tr>
                  <th className="py-3 px-3">Grievance ID</th>
                  <th className="py-3 px-3">Channel</th>
                  <th className="py-3 px-3">Complainant</th>
                  <th className="py-3 px-3">Received</th>
                  <th className="py-3 px-3">15-Day SLA</th>
                  <th className="py-3 px-3">Officer</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-stone-300">
                {filteredGrievances.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-stone-500">
                      No grievances matching current filter.
                    </td>
                  </tr>
                ) : (
                  filteredGrievances.map((g) => {
                    const sla = calculateGrievanceSla(g.received_at, g.status as GrievanceStatus);
                    return (
                      <tr key={g.id} className="hover:bg-stone-800/40">
                        <td className="py-3 px-3 font-mono font-bold text-stone-100">{g.id}</td>
                        <td className="py-3 px-3">
                          <span className="uppercase text-[10px] font-bold bg-stone-800 px-1.5 py-0.5 rounded">
                            {g.channel}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-stone-200">
                          {g.complainant_name}
                          <span className="block text-[10px] text-stone-500 font-normal">
                            {g.complainant_phone || g.complainant_email || "Direct"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-stone-400">
                          {new Date(g.received_at).toLocaleDateString()}
                          <span className="block text-[10px] text-stone-500">{sla.daysOpen}d open</span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              sla.slaSeverity === "red"
                                ? "bg-red-950 text-red-400 border border-red-800"
                                : sla.slaSeverity === "orange"
                                ? "bg-orange-950 text-orange-400 border border-orange-800"
                                : sla.slaSeverity === "yellow"
                                ? "bg-amber-950 text-amber-300 border border-amber-800"
                                : "bg-green-950 text-green-300 border border-green-800"
                            }`}
                          >
                            {sla.alertTier !== "NORMAL" ? sla.alertTier : `${sla.hoursRemainingTo15d}h left`}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-stone-400">{g.assigned_reviewer ?? "Unassigned"}</td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-stone-200">{g.status}</span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedGrievance(g);
                              setDecisionNotes(g.decision_notes || "");
                              setDecisionType(g.status === "ACKNOWLEDGED" ? "UNDER_REVIEW" : g.status);
                            }}
                            className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-[11px] transition-colors"
                          >
                            Review / Decide
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Grievance Review & Decision Modal */}
          {selectedGrievance && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-xl rounded-xl border border-stone-700 bg-stone-900 p-6 text-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div>
                    <h3 className="m-0 text-base font-bold text-stone-100">
                      Editorial Review: {selectedGrievance.id}
                    </h3>
                    <p className="text-xs text-stone-400">
                      Channel: {selectedGrievance.channel} · Complainant: {selectedGrievance.complainant_name}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedGrievance(null)}
                    className="text-stone-400 hover:text-stone-100 text-base font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 bg-stone-950 rounded-lg text-xs space-y-2 border border-stone-800">
                  <p><strong>Nature:</strong> {selectedGrievance.nature_of_grievance}</p>
                  <p><strong>Clause:</strong> {selectedGrievance.code_of_ethics_clause || "Not specified"}</p>
                  {selectedGrievance.article_url && (
                    <p>
                      <strong>Article URL:</strong>{" "}
                      <a href={selectedGrievance.article_url} target="_blank" className="text-sky-400 hover:underline">
                        {selectedGrievance.article_url}
                      </a>
                    </p>
                  )}
                  <p><strong>Grounds of Grievance:</strong> {selectedGrievance.grounds_of_grievance}</p>
                  {selectedGrievance.supporting_info && (
                    <p><strong>Supporting Evidence:</strong> {selectedGrievance.supporting_info}</p>
                  )}
                </div>

                <div className="p-3 bg-amber-950/30 border border-amber-900/60 rounded-lg text-xs text-amber-300">
                  <strong>Statutory Human Decision Control:</strong> Under Rule 11 of the IT Rules, the final decision on a news grievance must be executed by an authorized human officer. AI autonomous decisions are prohibited.
                </div>

                <form onSubmit={handleSaveGrievanceDecision} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-stone-300 mb-1">Decision / Status *</label>
                    <select
                      value={decisionType}
                      onChange={(e) => setDecisionType(e.target.value)}
                      className="w-full rounded-lg bg-stone-950 border border-stone-700 px-3 py-2 text-stone-100"
                    >
                      <option value="UNDER_REVIEW">UNDER_REVIEW (Active Investigation)</option>
                      <option value="ACTION_REQUIRED">ACTION_REQUIRED (Newsroom Correction Pending)</option>
                      <option value="RESOLVED">RESOLVED (Correction Applied / Grievance Redressed)</option>
                      <option value="REJECTED_WITH_REASON">REJECTED_WITH_REASON (No Violation of Code of Ethics)</option>
                      <option value="ESCALATED_LEVEL_II">ESCALATED_LEVEL_II (Escalated to Self-Regulating Body)</option>
                      <option value="ESCALATED_LEVEL_III">ESCALATED_LEVEL_III (Government Oversight Mechanism)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-300 mb-1">Authorized Reviewer Name *</label>
                    <input
                      type="text"
                      required
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="w-full rounded-lg bg-stone-950 border border-stone-700 px-3 py-2 text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-300 mb-1">
                      Reasoning / Notes / Response to Complainant *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      placeholder="Enter editorial verification details, steps taken, corrections made, or formal rejection grounds."
                      className="w-full rounded-lg bg-stone-950 border border-stone-700 px-3 py-2 text-stone-100"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                    <button
                      type="button"
                      onClick={() => setSelectedGrievance(null)}
                      className="px-4 py-2 rounded-lg bg-stone-800 text-stone-300 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingDecision}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50"
                    >
                      {isSubmittingDecision ? "Saving..." : "Record Statutory Decision →"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Monthly Reports (Rule 19) */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-stone-800 bg-stone-900/60">
            <div>
              <h3 className="m-0 text-sm font-bold text-stone-100">
                Rule 19 Monthly Disclosure Generator
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Automatically aggregates grievances, calculates resolution counts, and produces a privacy-safe report requiring human sign-off.
              </p>
            </div>

            <button
              onClick={() => handleGenerateReport(new Date().toISOString().slice(0, 7))}
              disabled={isGeneratingReport}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs disabled:opacity-50 shrink-0"
            >
              {isGeneratingReport ? "Generating..." : "Generate Current Month Report"}
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-900/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 border-b border-stone-800 font-bold uppercase tracking-wider text-stone-400">
                <tr>
                  <th className="py-3 px-3">Month</th>
                  <th className="py-3 px-3">Period</th>
                  <th className="py-3 px-3">Grievances Recv</th>
                  <th className="py-3 px-3">Resolved</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Approved By</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-stone-300">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-500">
                      No compliance reports generated yet. Click generate above.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => {
                    const m = r.metrics || {};
                    return (
                      <tr key={r.month} className="hover:bg-stone-800/40">
                        <td className="py-3 px-3 font-mono font-bold text-stone-100">{r.month}</td>
                        <td className="py-3 px-3 text-stone-400">{r.period_start} to {r.period_end}</td>
                        <td className="py-3 px-3 font-bold">{m.grievancesReceived ?? 0}</td>
                        <td className="py-3 px-3 text-green-400 font-bold">{m.grievancesResolved ?? 0}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === "PUBLISHED"
                                ? "bg-green-950 text-green-300 border border-green-800"
                                : "bg-amber-950 text-amber-300 border border-amber-800"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-stone-400">{r.approved_by || "Pending Sign-off"}</td>
                        <td className="py-3 px-3 text-right space-x-2">
                          {r.status !== "PUBLISHED" ? (
                            <button
                              onClick={() => handleApproveAndPublish(r.month)}
                              className="px-2.5 py-1 rounded bg-green-700 hover:bg-green-600 text-white font-bold text-[11px]"
                            >
                              Approve & Publish →
                            </button>
                          ) : (
                            <Link
                              href={`/compliance/${r.month}`}
                              target="_blank"
                              className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-[11px] inline-block"
                            >
                              View Public Disclosure ↗
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Rule 18 Publisher Information */}
      {activeTab === "rule18" && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl border border-stone-800 bg-stone-900/60 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="m-0 text-sm font-bold text-stone-100">
                  Form I · Information Furnishing by Digital News Publisher (Rule 18)
                </h3>
                <p className="text-stone-400 text-xs mt-0.5">
                  Authoritative Ministry of Information & Broadcasting framework.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                {rule18Data.verificationStatus}
              </span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-stone-950 rounded-lg">
                <dt className="text-stone-400 font-semibold">Publication Title</dt>
                <dd className="font-bold text-stone-100 mt-0.5">{rule18Data.publicationTitle}</dd>
              </div>
              <div className="p-3 bg-stone-950 rounded-lg">
                <dt className="text-stone-400 font-semibold">Website URL</dt>
                <dd className="font-mono text-stone-100 mt-0.5">{rule18Data.websiteUrl}</dd>
              </div>
              <div className="p-3 bg-stone-950 rounded-lg">
                <dt className="text-stone-400 font-semibold">Legal Operating Entity</dt>
                <dd className="font-bold text-stone-100 mt-0.5">{rule18Data.legalEntityName}</dd>
              </div>
              <div className="p-3 bg-stone-950 rounded-lg">
                <dt className="text-stone-400 font-semibold">Corporate Identity Number (CIN)</dt>
                <dd className="font-mono text-stone-100 mt-0.5">{rule18Data.cin}</dd>
              </div>
              <div className="p-3 bg-stone-950 rounded-lg sm:col-span-2">
                <dt className="text-stone-400 font-semibold">Registered Office Address</dt>
                <dd className="text-stone-200 mt-0.5">{rule18Data.registeredOffice}</dd>
              </div>
              <div className="p-3 bg-stone-950 rounded-lg">
                <dt className="text-stone-400 font-semibold">Founder & Director</dt>
                <dd className="font-bold text-stone-100 mt-0.5">{rule18Data.directorName}</dd>
              </div>
              <div className="p-3 bg-stone-950 rounded-lg">
                <dt className="text-stone-400 font-semibold">Statutory Grievance Officer</dt>
                <dd className="font-bold text-stone-100 mt-0.5">{rule18Data.grievanceOfficerName} ({rule18Data.grievanceOfficerPhone})</dd>
              </div>
              <div className="p-3 bg-stone-950 rounded-lg sm:col-span-2">
                <dt className="text-stone-400 font-semibold">Level-II Self-Regulating Body (SRB)</dt>
                <dd className="font-bold text-amber-300 mt-0.5">{rule18Data.srbMembershipStatus}</dd>
              </div>
              <div className="p-3 bg-stone-950 rounded-lg sm:col-span-2 border border-amber-900/50">
                <dt className="text-amber-400 font-semibold">Field Requiring Human Attention</dt>
                <dd className="text-stone-300 mt-0.5">
                  PAN: <code className="bg-stone-900 px-1.5 py-0.5 rounded text-amber-300">{rule18Data.pan}</code> (Input company PAN before formal submission to MIB portal).
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Tab 4: Health Checks */}
      {activeTab === "health" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {health.checks.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-stone-800 bg-stone-900/60 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-stone-500 uppercase">
                      {c.category}
                    </span>
                    <h4 className="m-0 text-sm font-bold text-stone-100">{c.title}</h4>
                  </div>
                  <p className="text-stone-300 mt-1">{c.details}</p>
                  {c.actionRequired && (
                    <p className="text-amber-400 mt-2 font-semibold">
                      Action Required: {c.actionRequired}
                    </p>
                  )}
                </div>

                <span
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase shrink-0 ${
                    c.status === "PASS"
                      ? "bg-green-950 text-green-300 border border-green-800"
                      : c.status === "WARN"
                      ? "bg-amber-950 text-amber-300 border border-amber-800"
                      : c.status === "FAIL"
                      ? "bg-red-950 text-red-300 border border-red-800"
                      : "bg-blue-950 text-blue-300 border border-blue-800"
                  }`}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
