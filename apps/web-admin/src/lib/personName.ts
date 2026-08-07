interface PersonNameParts {
  firstNameAr?: string | null;
  lastNameAr?: string | null;
  firstNameEn?: string | null;
  lastNameEn?: string | null;
}

function joinName(firstName?: string | null, lastName?: string | null): string {
  return [firstName, lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

/** Returns the name matching the UI language, with the other language as fallback. */
export function localizedPersonName(person: PersonNameParts, isArabic: boolean): string {
  const arabicName = joinName(person.firstNameAr, person.lastNameAr);
  const englishName = joinName(person.firstNameEn, person.lastNameEn);
  return isArabic ? arabicName || englishName : englishName || arabicName;
}
