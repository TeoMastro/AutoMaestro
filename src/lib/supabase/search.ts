/**
 * Build a PostgREST `or()` filter string for case-insensitive `ilike`
 * matches across multiple columns. Values are wrapped in double quotes
 * so that commas/parens in the search term don't terminate the filter,
 * and `\` / `"` inside the value are escaped per the PostgREST grammar.
 */
export function buildOrIlikeFilter(columns: string[], search: string): string {
  const escaped = search.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return columns.map((col) => `${col}.ilike."%${escaped}%"`).join(',');
}
