const IST = "Asia/Kolkata";

/** IPL window in IST — roughly Feb prep through May finals */
export function isIplSeason(date = new Date()): boolean {
  const month = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: IST,
      month: "numeric",
    }).format(date)
  );
  return month >= 2 && month <= 5;
}
