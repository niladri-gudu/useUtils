export interface RegexMatch {
  text: string;
  index: number;
  length: number;
  groups: (string | undefined)[];
  namedGroups: Record<string, string> | null;
}

export interface RegexResult {
  matches: RegexMatch[];
  execTime: number;
  replacedOutput: string;
  error: string | null;
}

/**
 * Parses and executes regex matching and replacement on a test string.
 * This function handles safety checks to prevent infinite loops from matching empty characters.
 */
export function evaluateRegex(
  pattern: string,
  flags: string,
  testString: string,
  replaceString: string = ''
): RegexResult {
  if (!pattern) {
    return { matches: [], execTime: 0, replacedOutput: '', error: null };
  }

  let regex: RegExp | null = null;
  let error: string | null = null;
  const matches: RegexMatch[] = [];
  let execTime = 0;
  let replacedOutput = '';

  try {
    regex = new RegExp(pattern, flags);
  } catch (e: any) {
    error = e.message;
  }

  if (regex && !error && testString) {
    const start = performance.now();
    try {
      // Test matching
      if (flags.includes('g')) {
        let match;
        let safetyCounter = 0;
        while ((match = regex.exec(testString)) !== null) {
          if (safetyCounter++ > 5000) {
            error = 'Regex evaluation halted to prevent browser freeze (infinite loop protection).';
            break;
          }
          matches.push({
            text: match[0],
            index: match.index,
            length: match[0].length,
            groups: Array.from(match).slice(1),
            namedGroups: (match.groups as Record<string, string>) || null,
          });
          if (match[0].length === 0) {
            regex.lastIndex++; // Advance lastIndex if matching empty string
          }
        }
      } else {
        const match = regex.exec(testString);
        if (match) {
          matches.push({
            text: match[0],
            index: match.index,
            length: match[0].length,
            groups: Array.from(match).slice(1),
            namedGroups: (match.groups as Record<string, string>) || null,
          });
        }
      }

      // Test replacement
      replacedOutput = testString.replace(regex, replaceString);
    } catch (e: any) {
      error = `Execution error: ${e.message}`;
    }
    execTime = performance.now() - start;
  }

  return { matches, execTime, replacedOutput, error };
}
