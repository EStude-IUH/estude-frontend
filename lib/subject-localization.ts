import { normalizeSearchKeyword } from "@/lib/search-keyword";

const SUBJECT_TRANSLATIONS = [
  ["Biology", "Sinh học"],
  ["Chemistry", "Hóa học"],
  ["Civic Education", "Giáo dục công dân"],
  ["Civics", "Giáo dục công dân"],
  ["Fine Arts", "Mỹ thuật"],
  ["Foreign Language", "Ngoại ngữ"],
  ["Foreign Language 1", "Ngoại ngữ 1"],
  ["Foreign Language 2", "Ngoại ngữ 2"],
  ["Geography", "Địa lý"],
  ["History", "Lịch sử"],
  ["Informatics", "Tin học"],
  ["Information Technology", "Tin học"],
  ["Literature", "Ngữ văn"],
  ["Mathematics", "Toán học"],
  ["Music", "Âm nhạc"],
  ["National Defense and Security Education", "Giáo dục quốc phòng và an ninh"],
  ["Natural Sciences", "Khoa học tự nhiên"],
  ["Physical Education", "Giáo dục thể chất"],
  ["Physics", "Vật lý"],
  ["Social Sciences", "Khoa học xã hội"],
  ["Technology", "Công nghệ"],
] as const;

const vietnameseNameByEnglishName = new Map(
  SUBJECT_TRANSLATIONS.map(([englishName, vietnameseName]) => [
    normalizeSearchKeyword(englishName),
    vietnameseName,
  ]),
);

export function toVietnameseSubjectName(name: string): string {
  return vietnameseNameByEnglishName.get(normalizeSearchKeyword(name)) ?? name;
}

export function getSubjectApiSearchQueries(search: string): string[] {
  const trimmedSearch = search.trim();
  if (!trimmedSearch) return [""];

  const normalizedSearch = normalizeSearchKeyword(trimmedSearch);
  if (!normalizedSearch) return [trimmedSearch];

  const translatedQueries = SUBJECT_TRANSLATIONS
    .filter(([englishName, vietnameseName]) =>
      normalizeSearchKeyword(englishName).includes(normalizedSearch)
      || normalizeSearchKeyword(vietnameseName).includes(normalizedSearch),
    )
    .map(([englishName]) => englishName);

  return [...new Set([trimmedSearch, ...translatedQueries])];
}
