// 沿用「營一大挑戰」既有公開發布網址；僅以匿名 GET 讀取。
export const OFFICIAL_QUIZ_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQG0lwtVBsXEYihjT93kcX5BzjQ5rNRf_KzUA4qwc6LFSiHnSvnfcxkhrw3ZJS6zB3C8pybHzjmLhAO/pub?output=csv';

export const QUIZ_CSV_URL = import.meta.env.VITE_QUIZ_CSV_URL || OFFICIAL_QUIZ_CSV_URL;
