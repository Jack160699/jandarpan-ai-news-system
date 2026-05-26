"use client";

import { ClientTimeLabel } from "../ui/ClientTimeLabel";
import type { AiAsset } from "../types";

type AssetsPanelProps = {
  assets: AiAsset[];
};

export function AssetsPanel({ assets }: AssetsPanelProps) {
  return (
    <div className="jd-ai-panel-body">
      {assets.length === 0 ? (
        <p className="jd-ai-empty">
          Saved headlines, snippets, and social drafts will appear here.
        </p>
      ) : (
        <ul className="jd-ai-assets">
          {assets.map((asset) => (
            <li key={asset.id} className="jd-ai-assets__item">
              <span className="jd-ai-assets__type">{asset.type}</span>
              <strong>{asset.label}</strong>
              <p>{asset.preview}</p>
              <ClientTimeLabel iso={asset.createdAt} preset="datetime-short" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
