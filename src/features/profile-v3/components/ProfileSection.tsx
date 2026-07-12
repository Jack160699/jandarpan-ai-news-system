"use client";

import type { ReactNode } from "react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { Card, CardBody } from "@/design-system/components/Card";
import type { ProfileV3SectionId } from "../types";

export type ProfileSectionProps = {
  id: ProfileV3SectionId;
  title: string;
  kicker?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function ProfileSection({
  id,
  title,
  kicker,
  description,
  action,
  children,
}: ProfileSectionProps) {
  const titleId = `${id}-title`;

  return (
    <section
      id={id}
      className="pv3-section"
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <SectionHeader
        title={title}
        kicker={kicker}
        action={action}
        className="pv3-section__header"
      />
      <h2 id={titleId} className="sr-only">
        {title}
      </h2>
      {description ? (
        <p className="pv3-section__description">{description}</p>
      ) : null}
      <Card elevation="elevated" className="pv3-section__card">
        <CardBody className="pv3-section__body">{children}</CardBody>
      </Card>
    </section>
  );
}
