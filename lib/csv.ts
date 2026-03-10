export function generateCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(",")];

  for (const row of rows) {
    const line = headers
      .map((header) => {
        const value = row[header];
        if (value == null) {
          return "";
        }
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",");
    csvLines.push(line);
  }

  return csvLines.join("\n");
}
