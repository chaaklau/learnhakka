// Numerical tone → diacritic conversion
const TONE_DIACRITICS = " \u0301\u0304\u0306\u0300\u0306\u0300" // index 1–6

export function romToDiacritics(pron) {
  if (!pron) return pron
  return pron.replace(/(\D*[aeo]|\D*[iu](?!\d)|\D*[iumn])(\D*)(\d)/g,
    (_, $1, $2, $3) => $1 + TONE_DIACRITICS[+$3] + $2
  ).normalize('NFC')
}

