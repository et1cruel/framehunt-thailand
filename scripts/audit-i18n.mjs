import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "src");
const translations = JSON.parse(readFileSync(path.join(sourceRoot, "i18n/en.json"), "utf8"));
const files = [];

function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(absolute);
    else if (/\.(?:tsx|jsx)$/u.test(entry.name) && !absolute.includes(`${path.sep}i18n${path.sep}`)) files.push(absolute);
  }
}

for (const directory of ["pages", "components"]) collect(path.join(sourceRoot, directory));

const untranslated = [];
const attributeGaps = [];
const attributeKeysAvailable = [];
const thaiContent = [];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const relative = path.relative(root, file).replaceAll(path.sep, "/");

  function visit(node) {
    if (ts.isJsxText(node)) {
      const text = node.getText(parsed).replace(/\s+/gu, " ").trim();
      if (/[\u0E00-\u0E7F]/u.test(text)) {
        const item = { file: relative, text, hasTranslation: typeof translations[text] === "string" };
        (item.hasTranslation ? untranslated : thaiContent).push(item);
      }
    } else if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const text = node.initializer.text.trim();
      if (/[\u0E00-\u0E7F]/u.test(text)) {
        const parentTag = node.parent.parent && ts.isJsxElement(node.parent.parent)
          ? node.parent.parent.openingElement.tagName.getText(parsed)
          : node.parent.parent && ts.isJsxSelfClosingElement(node.parent.parent)
            ? node.parent.parent.tagName.getText(parsed)
            : "";
        if (!(parentTag === "Localized" && node.name.getText(parsed) === "text")) {
          const item = { file: relative, attribute: node.name.getText(parsed), text, hasTranslation: typeof translations[text] === "string" };
          (item.hasTranslation ? attributeKeysAvailable : attributeGaps).push(item);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(parsed);
}

const locations = JSON.parse(readFileSync(path.join(sourceRoot, "data/locations.generated.json"), "utf8")).locations
  .filter(({ status }) => status === "published");
const activityPlaces = JSON.parse(readFileSync(path.join(sourceRoot, "data/activity-directory.json"), "utf8")).places;
const activityCopy = JSON.parse(readFileSync(path.join(sourceRoot, "i18n/activity-descriptions.en.json"), "utf8"));
const studios = JSON.parse(readFileSync(path.join(sourceRoot, "data/studios-directory.json"), "utf8")).studios;
const studioCopy = JSON.parse(readFileSync(path.join(sourceRoot, "i18n/studios.en.json"), "utf8"));
const frameNotesSource = readFileSync(path.join(sourceRoot, "data/frame-notes.ts"), "utf8");
const { frameNotes } = await import("data:text/javascript;charset=utf-8," + encodeURIComponent(ts.transpileModule(frameNotesSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText));
const frameNotesEnglish = JSON.parse(readFileSync(path.join(sourceRoot, "i18n/frame-notes.en.json"), "utf8"));
const activityDescriptionRecords = activityPlaces.filter(({ description }) => description?.trim());
const activityAccessNotes = [...new Set(activityPlaces.map(({ accessNote }) => accessNote).filter(Boolean))];
const activityVisitNotes = [...new Set(activityPlaces.map(({ visitNote }) => visitNote).filter(Boolean))];
const activityHours = [...new Set(activityPlaces.map(({ openingHours }) => openingHours).filter(Boolean))];
const featureNames = [...new Set(studios.flatMap(({ features }) => features))];
const locationContent = {
  published: locations.length,
  missingEnglishName: locations.filter(({ name_en }) => !name_en?.trim()).length,
  missingEnglishDescription: locations.filter(({ description_en }) => !description_en?.trim()).length,
};
const directoryContent = {
  activityDescriptions: {
    sourceRecords: activityDescriptionRecords.length,
    translated: activityDescriptionRecords.filter(({ name }) => activityCopy.descriptions[name]).length,
    missingTranslations: activityDescriptionRecords.filter(({ name }) => !activityCopy.descriptions[name]).length,
  },
  activityNotes: {
    access: { sourceValues: activityAccessNotes.length, missingTranslations: activityAccessNotes.filter((text) => !activityCopy.accessNotes[text]) },
    visit: { sourceValues: activityVisitNotes.length, missingTranslations: activityVisitNotes.filter((text) => !activityCopy.visitNotes[text]) },
    openingHours: { sourceValues: activityHours.length, missingTranslations: activityHours.filter((text) => !activityCopy.openingHours[text]) },
  },
  studios: {
    total: studios.length,
    missingEnglishName: studios.filter(({ id }) => !studioCopy.studios[id]?.name).length,
    missingEnglishDescription: studios.filter(({ id }) => !studioCopy.studios[id]?.description).length,
    uniqueDistricts: [...new Set(studios.map(({ district }) => district))].length,
    missingEnglishDistrict: studios.filter(({ district }) => !studioCopy.districts[district]).length,
    uniqueFeatures: featureNames.length,
    untranslatedFeatures: featureNames.filter((feature) => !studioCopy.features[feature]),
  },
  cameraNotes: {
    total: Object.keys(frameNotes).length,
    missingEnglishTitle: Object.keys(frameNotes).filter((slug) => !frameNotesEnglish[slug]?.title).length,
    missingEnglishDirection: Object.keys(frameNotes).filter((slug) => !frameNotesEnglish[slug]?.direction).length,
  },
  namesRetainedInOriginalScript: {
    activities: activityPlaces.filter(({ name }) => /[\u0E00-\u0E7F]/u.test(name)).length,
    secondhand: JSON.parse(readFileSync(path.join(sourceRoot, "data/secondhand-shops.json"), "utf8")).shops.filter(({ name }) => /[\u0E00-\u0E7F]/u.test(name)).length,
  },
};

console.log(JSON.stringify({
  staticText: {
    translatedKeysAvailableForRawNodes: untranslated.length,
    untranslatedNodes: thaiContent.length,
    untranslatedByFile: Object.fromEntries([...new Set(thaiContent.map(({ file }) => file))].map((file) => [file, thaiContent.filter((item) => item.file === file).length])),
  },
  attributesWithTranslationKeysButNotLocalized: attributeKeysAvailable.length,
  untranslatedAttributes: process.argv.includes("--details") ? attributeGaps : attributeGaps.length,
  locationContent,
  directoryContent,
  remainingStaticText: process.argv.includes("--details") ? thaiContent : thaiContent.length,
}, null, 2));

if (process.argv.includes("--strict") && (
  thaiContent.length || attributeGaps.length || attributeKeysAvailable.length ||
  locationContent.missingEnglishName || locationContent.missingEnglishDescription ||
  directoryContent.activityDescriptions.missingTranslations ||
  directoryContent.activityNotes.access.missingTranslations.length ||
  directoryContent.activityNotes.visit.missingTranslations.length ||
  directoryContent.activityNotes.openingHours.missingTranslations.length ||
  directoryContent.studios.missingEnglishName || directoryContent.studios.missingEnglishDescription || directoryContent.studios.missingEnglishDistrict ||
  directoryContent.studios.untranslatedFeatures.length ||
  directoryContent.cameraNotes.missingEnglishTitle || directoryContent.cameraNotes.missingEnglishDirection
)) {
  process.exitCode = 1;
}
