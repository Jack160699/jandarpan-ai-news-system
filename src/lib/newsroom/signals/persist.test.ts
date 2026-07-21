import { describe, expect, it } from "vitest";
import {
  assertPersistenceOk,
  derivePersistFlags,
  emptySignalPersistResult,
} from "./persist";

describe("derivePersistFlags", () => {
  it("all batches failed when every batch errored", () => {
    expect(
      derivePersistFlags({ attempted: 80, batchCount: 2, failedBatches: 2 })
    ).toEqual({ allBatchesFailed: true, partialPersistence: false });
  });

  it("partialPersistence when some batches succeed and some fail", () => {
    expect(
      derivePersistFlags({ attempted: 80, batchCount: 2, failedBatches: 1 })
    ).toEqual({ allBatchesFailed: false, partialPersistence: true });
  });

  it("zero inserted via ignoreDuplicates is not a failure (no failed batches)", () => {
    expect(
      derivePersistFlags({ attempted: 40, batchCount: 1, failedBatches: 0 })
    ).toEqual({ allBatchesFailed: false, partialPersistence: false });
  });

  it("attempted=0 never marks allBatchesFailed", () => {
    expect(
      derivePersistFlags({ attempted: 0, batchCount: 0, failedBatches: 0 })
    ).toEqual({ allBatchesFailed: false, partialPersistence: false });
  });
});

describe("assertPersistenceOk", () => {
  it("throws when allBatchesFailed", () => {
    const result = {
      ...emptySignalPersistResult(),
      attempted: 10,
      failedBatches: 1,
      allBatchesFailed: true,
      persistenceErrors: ["batch_0: column geo_metadata does not exist"],
    };
    expect(() => assertPersistenceOk(result)).toThrow(/persistence_failed/);
  });

  it("does not throw for duplicate-only zero inserts", () => {
    const result = {
      ...emptySignalPersistResult(),
      attempted: 10,
      inserted: 0,
      skippedDuplicates: 10,
    };
    expect(() => assertPersistenceOk(result)).not.toThrow();
  });
});
