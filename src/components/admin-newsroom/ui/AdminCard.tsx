"use client";

import { motion } from "framer-motion";

type AdminCardProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function AdminCard({
  title,
  description,
  action,
  children,
  className,
}: AdminCardProps) {
  return (
    <motion.section
      className={`anr-card ${className ?? ""}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      {title ? (
        <header className="anr-card__head anr-card__head--split">
          <div>
            <h3>{title}</h3>
            {description ? <p className="anr-meta">{description}</p> : null}
          </div>
          {action ? <div className="anr-card__action">{action}</div> : null}
        </header>
      ) : null}
      {children}
    </motion.section>
  );
}
