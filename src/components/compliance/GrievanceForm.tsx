"use client";

import { useState } from "react";
import { CANONICAL_IDENTITY } from "@/lib/compliance/canonical-identity";

export function GrievanceForm() {
  const [complainantName, setComplainantName] = useState("");
  const [complainantEmail, setComplainantEmail] = useState("");
  const [complainantPhone, setComplainantPhone] = useState("");
  const [articleUrl, setArticleUrl] = useState("");
  const [articleHeadline, setArticleHeadline] = useState("");
  const [natureOfGrievance, setNatureOfGrievance] = useState("Factual Inaccuracy & Misleading Reporting");
  const [codeOfEthicsClause, setCodeOfEthicsClause] = useState("Accuracy and Fairness (Norms of Journalistic Conduct)");
  const [groundsOfGrievance, setGroundsOfGrievance] = useState("");
  const [supportingInfo, setSupportingInfo] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    grievanceId: string;
    acknowledgementText: string;
    slaTimeline: any;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consentGiven) {
      setErrorMsg("Please provide your consent to process the grievance under the statutory procedure.");
      return;
    }

    if (!complainantEmail && !complainantPhone) {
      setErrorMsg("Please provide either your Email address or Phone/WhatsApp number so we can transmit formal statutory correspondence.");
      return;
    }

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/compliance/grievance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "web",
          complainantName,
          complainantEmail,
          complainantPhone,
          articleUrl,
          articleHeadline,
          natureOfGrievance,
          codeOfEthicsClause,
          groundsOfGrievance,
          supportingInfo,
          consentGiven,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorMsg(data.error ?? "Failed to submit grievance. Please try again or reach the Grievance Officer via WhatsApp/Email directly.");
        return;
      }

      setSuccessData({
        grievanceId: data.grievanceId,
        acknowledgementText: data.acknowledgementText,
        slaTimeline: data.slaTimeline,
      });
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("A network error occurred while submitting your grievance. Please email shriyanshchandrakar@gmail.com directly.");
    }
  }

  if (status === "success" && successData) {
    return (
      <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50/90 dark:bg-green-950/40 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-xl">
            ✓
          </div>
          <div>
            <h3 className="m-0 text-lg font-bold text-green-900 dark:text-green-100">
              Grievance Registered Successfully
            </h3>
            <p className="text-xs text-green-700 dark:text-green-300">
              Statutory reference ID: <strong className="font-mono text-sm underline">{successData.grievanceId}</strong>
            </p>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 rounded-lg border border-green-200 dark:border-green-900 text-sm space-y-2">
          <p className="font-semibold text-stone-900 dark:text-stone-100">Official Acknowledgment Note:</p>
          <blockquote className="text-stone-700 dark:text-stone-300 italic border-l-2 border-green-500 pl-3">
            {successData.acknowledgementText}
          </blockquote>
          <div className="pt-2 text-xs text-stone-500 dark:text-stone-400 space-y-1">
            <p>• <strong>Grievance Officer:</strong> {CANONICAL_IDENTITY.grievanceOfficer.name}</p>
            <p>• <strong>Statutory 15-Day SLA:</strong> Decision and response will be provided within 15 calendar days.</p>
            <p>• <strong>Contact for Updates:</strong> WhatsApp {CANONICAL_IDENTITY.grievanceOfficer.primaryWhatsApp} quoting your reference ID.</p>
          </div>
        </div>

        <button
          onClick={() => {
            setStatus("idle");
            setSuccessData(null);
            setGroundsOfGrievance("");
            setArticleUrl("");
          }}
          className="text-xs text-green-800 dark:text-green-300 underline font-semibold"
        >
          Submit another grievance or clarification
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm" noValidate>
      {errorMsg ? (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-200 text-xs font-semibold">
          {errorMsg}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="complainant-name" className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
            Complainant Full Name *
          </label>
          <input
            id="complainant-name"
            type="text"
            required
            value={complainantName}
            onChange={(e) => setComplainantName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-stone-900 dark:text-stone-100"
          />
        </div>

        <div>
          <label htmlFor="complainant-phone" className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
            Phone / WhatsApp Number (Recommended)
          </label>
          <input
            id="complainant-phone"
            type="tel"
            value={complainantPhone}
            onChange={(e) => setComplainantPhone(e.target.value)}
            placeholder="e.g. +91 98765 43210"
            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-stone-900 dark:text-stone-100"
          />
        </div>
      </div>

      <div>
        <label htmlFor="complainant-email" className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
          Email Address (For Written Statutory Orders)
        </label>
        <input
          id="complainant-email"
          type="email"
          value={complainantEmail}
          onChange={(e) => setComplainantEmail(e.target.value)}
          placeholder="e.g. ramesh@example.com"
          className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-stone-900 dark:text-stone-100"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="article-url" className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
            Article URL on Jan Darpan (if applicable)
          </label>
          <input
            id="article-url"
            type="url"
            value={articleUrl}
            onChange={(e) => setArticleUrl(e.target.value)}
            placeholder="https://www.jandarpan.news/story/..."
            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-stone-900 dark:text-stone-100"
          />
        </div>

        <div>
          <label htmlFor="article-headline" className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
            Article Headline / Date of Publication
          </label>
          <input
            id="article-headline"
            type="text"
            value={articleHeadline}
            onChange={(e) => setArticleHeadline(e.target.value)}
            placeholder="Headline or approximate publishing date"
            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-stone-900 dark:text-stone-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="nature-of-grievance" className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
            Nature of Grievance *
          </label>
          <select
            id="nature-of-grievance"
            value={natureOfGrievance}
            onChange={(e) => setNatureOfGrievance(e.target.value)}
            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-stone-900 dark:text-stone-100"
          >
            <option value="Factual Inaccuracy & Misleading Reporting">Factual Inaccuracy & Misleading Reporting</option>
            <option value="Defamation / Reputational Damage">Defamation / Reputational Damage</option>
            <option value="Violation of Code of Ethics / Norms of Journalistic Conduct">Violation of Code of Ethics</option>
            <option value="Infringement of Privacy / Sensitive Personal Data">Infringement of Privacy</option>
            <option value="Copyright & Unattributed Media">Copyright & Unattributed Media</option>
            <option value="Content Inciting Violence or Public Disorder">Content Inciting Violence or Public Disorder</option>
            <option value="Other Statutory Grievance">Other Statutory Grievance</option>
          </select>
        </div>

        <div>
          <label htmlFor="ethics-clause" className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
            Code of Ethics Provision Invoked
          </label>
          <select
            id="ethics-clause"
            value={codeOfEthicsClause}
            onChange={(e) => setCodeOfEthicsClause(e.target.value)}
            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-stone-900 dark:text-stone-100"
          >
            <option value="Accuracy and Fairness (Norms of Journalistic Conduct)">Accuracy and Fairness (Norms of Journalistic Conduct)</option>
            <option value="Right of Reply & Opportunity for Explanation">Right of Reply & Opportunity for Explanation</option>
            <option value="Protection of Minors & Victims of Crime">Protection of Minors & Victims of Crime</option>
            <option value="Defamation and Caution Against Scurrilous Writing">Defamation and Caution Against Scurrilous Writing</option>
            <option value="Programme Code under Cable TV Act (Rule 18 / Part III)">Programme Code under Cable TV Act</option>
            <option value="General Editorial Integrity">General Editorial Integrity</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="grounds-of-grievance" className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
          Detailed Grounds of Grievance * (Min 10 characters)
        </label>
        <textarea
          id="grounds-of-grievance"
          required
          rows={4}
          value={groundsOfGrievance}
          onChange={(e) => setGroundsOfGrievance(e.target.value)}
          placeholder="Please describe specifically which statements, facts, or images in the article are inaccurate, defamatory, or violative, and specify the remedy sought (e.g. correction, clarification, takedown)."
          className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-stone-900 dark:text-stone-100"
        />
      </div>

      <div>
        <label htmlFor="supporting-info" className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
          Supporting Evidence / Links / Document Details (Optional)
        </label>
        <textarea
          id="supporting-info"
          rows={2}
          value={supportingInfo}
          onChange={(e) => setSupportingInfo(e.target.value)}
          placeholder="Provide links to government notifications, court records, verifiable press statements, or relevant documentation supporting your claim."
          className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-stone-900 dark:text-stone-100"
        />
      </div>

      <div className="flex items-start gap-2 pt-2">
        <input
          id="consent-given"
          type="checkbox"
          required
          checked={consentGiven}
          onChange={(e) => setConsentGiven(e.target.checked)}
          className="mt-1 rounded border-stone-300 text-[var(--jd-red)] focus:ring-[var(--jd-red)]"
        />
        <label htmlFor="consent-given" className="text-xs text-stone-600 dark:text-stone-400">
          I declare in good faith that the particulars stated above are true and accurate. I understand this grievance will be registered under Rule 11 of the Information Technology Rules, 2021, and will be reviewed by the designated Grievance Officer.
        </label>
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-white font-bold text-sm bg-[var(--jd-red)] hover:bg-[#851428] disabled:opacity-50 transition-colors shadow-sm"
      >
        {status === "submitting" ? "Registering Grievance..." : "Register Statutory Grievance →"}
      </button>
    </form>
  );
}
