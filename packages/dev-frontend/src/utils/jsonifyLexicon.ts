import { Lexicon } from "../lexicon";

export const jsonifyLexicon = (lexicon: Record<string, Lexicon>) => {
  const entries = Object.entries(lexicon).map(([lexiconKey, value]) => {
    const jsonKey = lexiconKey
      .split("_")
      .map((string, index) => {
        if (index === 0) {
          return string.toLowerCase();
        }

        const firstLetter = string.substring(0, 1);
        const rest = string.substring(1);

        return `${firstLetter.toUpperCase()}${rest.toLowerCase()}`;
      })
      .join("");

    return [jsonKey, value];
  });

  return Object.fromEntries(entries);
};
