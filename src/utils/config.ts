export const FHIR_VERSION_URLS: Record<string, string> = {
  R5: "https://hl7.org/fhir/",
  R4B: "https://hl7.org/fhir/R4B/",
  R4: "https://hl7.org/fhir/R4/",
  STU3: "https://hl7.org/fhir/STU3/",
};

export function getHL7BaseUrl(version: string): string {
  return FHIR_VERSION_URLS[version] ?? FHIR_VERSION_URLS["R4"];
}

export interface BelgianIG {
  link: string;  // URL path segment
  git: string;   // Identifier / git repo name
  title: string;
  desc: string;
}

export const BELGIAN_IGs: BelgianIG[] = [
  { link: "core",              git: "core",              title: "Core",              desc: "Core resources like Patient, Practitioner,..." },
  { link: "vaccination",       git: "vaccination",       title: "Vaccination",       desc: "Resources linked to the Vaccination CareSet" },
  { link: "allergy",           git: "allergy",           title: "Allergy Intolerance", desc: "Resources linked to the Allergy Intolerance CareSet" },
  { link: "medication/en",     git: "medication",        title: "Medication",        desc: "Resources linked to the Medication" },
  { link: "core-clinical",     git: "core-clinical",     title: "Core Clinical",     desc: "Resources linked to the Core Clinical Transversal concepts" },
  { link: "mycarenet/en",      git: "mycarenet",         title: "MyCareNet",         desc: "Resources linked to MyCareNet" },
  { link: "lab",               git: "lab",               title: "Labo Result",       desc: "Resources linked to the Labo Result Project" },
  { link: "public-health",     git: "public-health",     title: "Public Health",     desc: "Resources for public health reporting" },
  { link: "infsec",            git: "infsec",            title: "Infra & Security",  desc: "Resources linked to the Infrastructure & Security" },
  { link: "patientwill",       git: "patientwill",       title: "Patient Will",      desc: "Resources linked to the Patient Will CareSet" },
  { link: "nihdi-terminology/en", git: "nihdi-terminology", title: "NIHDI Terminology", desc: "ValueSets from NIHDI related legal texts" },
  { link: "patient-care",      git: "patient-care",      title: "Patient Care",      desc: "Resources linked to the Patient Care CareSet" },
  { link: "pss",               git: "pss",               title: "PSS",               desc: "Resources linked to the Prescription Search Support CareSet" },
  { link: "drp",               git: "referral",          title: "DRP",               desc: "Resources linked to the Digital Referral Prescription CareSet" },
  { link: "patient-dossier",   git: "patient-dossier",   title: "Patient Dossier",   desc: "Resources linked to the Patient Dossier" },
  { link: "childreport/en",    git: "childrecord",       title: "Child Report",      desc: "Resources linked to the Child Report" },
];

export const BELGIAN_IG_GIT_NAMES = BELGIAN_IGs.map(ig => ig.git) as [string, ...string[]];
