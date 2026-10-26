/**
 * Name patterns of `discover[].include` / `exclude`: `*` matches any run of characters (`:`
 * included, so `topp:*` takes a workspace), `?` one character; everything else is literal and
 * the match is case-sensitive over the whole name.
 */
export function compileGlob(patterns: readonly string[]): (name: string) => boolean {
  const regexes = patterns.map(
    (pattern) =>
      new RegExp(
        `^${pattern
          .split('')
          .map((ch) =>
            ch === '*' ? '.*' : ch === '?' ? '.' : ch.replace(/[\\^$.|+()[\]{}]/g, '\\$&'),
          )
          .join('')}$`,
      ),
  );
  return (name) => regexes.some((re) => re.test(name));
}

/** Whether a name passes `include` (every name when absent) and is not in `exclude`. */
export function nameFilter(
  include?: readonly string[],
  exclude?: readonly string[],
): (name: string) => boolean {
  const included = include ? compileGlob(include) : () => true;
  const excluded = exclude ? compileGlob(exclude) : () => false;
  return (name) => included(name) && !excluded(name);
}
