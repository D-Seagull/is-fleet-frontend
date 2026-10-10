import { describe, expect, it } from "vitest";
import { sortRows } from "../use-table-sort";

type Row = { id: string; plate: string; rating: number | null; driver?: string };
const rows: Row[] = [
  { id: "a", plate: "TR 10", rating: 4.5, driver: "Іван" },
  { id: "b", plate: "TR 9", rating: null, driver: "" },
  { id: "c", plate: "tr 2", rating: 3, driver: "Андрій" },
  { id: "d", plate: "TR 9", rating: 5 },
];
const cols = {
  plate: (r: Row) => r.plate,
  rating: (r: Row) => r.rating,
  driver: (r: Row) => r.driver,
};
const ids = (r: Row[]) => r.map((x) => x.id);

describe("sortRows", () => {
  it("keeps the server order when nothing is selected", () => {
    expect(ids(sortRows(rows, null, cols))).toEqual(["a", "b", "c", "d"]);
  });

  it("sorts text naturally and case-insensitively (TR 9 before TR 10)", () => {
    expect(ids(sortRows(rows, { key: "plate", dir: "asc" }, cols))).toEqual([
      "c",
      "b",
      "d",
      "a",
    ]);
  });

  it("is stable: equal values keep their original order, both directions", () => {
    const desc = ids(sortRows(rows, { key: "plate", dir: "desc" }, cols));
    expect(desc).toEqual(["a", "b", "d", "c"]);
  });

  it("sorts numbers numerically and puts blanks last either way", () => {
    expect(ids(sortRows(rows, { key: "rating", dir: "asc" }, cols))).toEqual([
      "c",
      "a",
      "d",
      "b",
    ]);
    expect(ids(sortRows(rows, { key: "rating", dir: "desc" }, cols))).toEqual([
      "d",
      "a",
      "c",
      "b",
    ]);
  });

  it("treats empty strings / missing values as blank (Cyrillic sorted)", () => {
    expect(ids(sortRows(rows, { key: "driver", dir: "asc" }, cols))).toEqual([
      "c",
      "a",
      "b",
      "d",
    ]);
  });
});
