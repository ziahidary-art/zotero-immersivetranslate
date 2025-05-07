import { Language } from "./types";
import {
  langMap,
  languages,
  nativeLangMap,
  zhCNLangMap,
  zhTWLangMap,
} from "./config";

export const getAllLanguages: () => Language[] = () => {
  return languages;
};

export const getLanguages: () => Language[] = () => {
  return languages.filter((lang) => {
    return lang !== "auto";
  });
};

export const getLanguageOptions: () => {
  value: string;
  label: string;
}[] = () => {
  return getLanguages().map((lang) => {
    return {
      value: lang,
      label: nativeLangMap[lang] || lang,
    };
  });
};

export const getLanguageName: (
  lang: Language,
  interfaceLanguage: Language,
  useOriginal?: boolean,
  useInterfaceLanguage?: boolean,
) => string = (lang, interfaceLanguage, useOriginal, useInterfaceLanguage) => {
  const nativeLang = nativeLangMap[lang] || lang;
  const fallbackLang = langMap[lang] || lang;
  const zhLang = zhCNLangMap[lang];
  const zhTWLang = zhTWLangMap[lang];
  const internalNames = {
    "zh-CN": zhLang,
    "zh-TW": zhTWLang,
    en: fallbackLang,
  };

  if (useOriginal) {
    if (
      // @ts-ignore: it's ok
      internalNames[lang]
    ) {
      // @ts-ignore: it's ok
      return internalNames[lang];
    }
    return fallbackLang;
  }

  const isShowNativeLang =
    lang !== interfaceLanguage && nativeLang !== "All Languages";
  if (
    // @ts-ignore: it's ok
    internalNames[interfaceLanguage]
  ) {
    // @ts-ignore: it's ok
    const locale = internalNames[interfaceLanguage];
    if (useInterfaceLanguage) {
      return locale;
    }

    if (lang === "auto") {
      return locale;
    } else if (lang === "placeholder") {
      return locale;
    }
    return isShowNativeLang ? `${locale} (${nativeLang})` : `${locale}`;
  } else {
    return isShowNativeLang ? `${fallbackLang} (${nativeLang})` : fallbackLang;
  }
};

export {
  langMap,
  languages,
  nativeLangMap,
  zhCNLangMap,
  zhTWLangMap,
} from "./config";
