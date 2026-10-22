import type { AppLang } from './types';

export interface Strings {
  appTitle: string; appSub: string; emailLabel: string; passLabel: string;
  login: string; signup: string; signUp: string; noAccount: string;
  haveAccount: string; logout: string; newLecture: string; selectFile: string;
  fileHint: string; langInLecture: string; uploadBtn: string; progress: string;
  myLectures: string; noLectures: string; emptySub: string; dlTxt: string;
  dlDoc: string; dlPdf: string; copyTxt: string; shareTxt: string;
  delete: string; deleting: string; deleted: string; fileTooLarge: string;
  selectFirst: string; loginAgain: string; uploading: string; processing: string;
  done: string; error: string; loaded: string; confirmDelete: string;
  cancel: string; copied: string; copyFailed: string; shareFailed: string;
  transcriptionComplete: string; transcriptionFailed: string; accountCreated: string;
  dropHere: string; userMenu: string; langUrAr: string; langUr: string;
  langAr: string; langHi: string; langGu: string; langMulti: string;
  balance: string; balanceFailed: string;
  original: string; translitFailed: string;
}

export const I18N: Record<AppLang, Strings> = {
  ur: {
    appTitle: 'درس ٹرانسکرپشن', appSub: 'عربی + اردو • لاگ ان کریں',
    emailLabel: 'ای میل ایڈریس', passLabel: 'پاس ورڈ',
    login: 'لاگ ان', signup: 'اکاؤنٹ بنائیں', signUp: 'نئی رکنیت',
    noAccount: 'اکاؤنٹ نہیں؟', haveAccount: 'پہلے سے اکاؤنٹ ہے؟',
    logout: 'لاگ آؤٹ', newLecture: 'نئی ریکارڈنگ',
    selectFile: 'ریکارڈنگ منتخب کریں', fileHint: 'm4a / mp3 / wav / opus — 1 تا 4 گھنٹے',
    langInLecture: 'درس کی زبان', uploadBtn: 'اپلوڈ + ٹرانسکرپشن',
    progress: 'پیشرفت', myLectures: 'میری دروس', noLectures: 'کوئی درس نہیں',
    emptySub: 'شروع کرنے کے لیے ریکارڈنگ اپلوڈ کریں',
    dlTxt: '.txt ڈاؤنلوڈ', dlDoc: 'Word ڈاؤنلوڈ', dlPdf: 'PDF پرنٹ',
    copyTxt: 'کاپی کریں', shareTxt: 'شیئر کریں', delete: 'حذف کریں',
    deleting: 'حذف ہو رہا ہے...', deleted: 'حذف کر دیا گیا',
    fileTooLarge: 'فائل بہت بڑی ہے (حد 100MB)', selectFirst: 'پہلے فائل منتخب کریں',
    loginAgain: 'دوبارہ لاگ ان کریں', uploading: 'اپلوڈ ہو رہا ہے',
    processing: 'ٹرانسکرپشن جاری ہے (~3-5 منٹ)', done: 'مکمل',
    error: 'خرابی', loaded: 'لوڈ ہو گیا', confirmDelete: 'کیا واقعی حذف کریں؟',
    cancel: 'منسوخ', copied: 'کاپی ہو گیا!', copyFailed: 'کاپی ناکام',
    shareFailed: 'شیئر ناکام', transcriptionComplete: 'ٹرانسکرپشن مکمل',
    transcriptionFailed: 'ٹرانسکرپشن ناکام', accountCreated: 'اکاؤنٹ بنا دیا گیا',
    dropHere: 'یہاں چھوڑیں', userMenu: 'صارف کا مینو',
    langUrAr: 'اردو + عربی', langUr: 'صرف اردو', langAr: 'صرف عربی',
    langHi: 'ہندی', langGu: 'گجراتی', langMulti: 'خودکار شناخت',
    balance: 'بیلنس', balanceFailed: 'بیلنس لوڈ ناکام',
    original: 'اصل', translitFailed: 'رسم الخط تبدیل ناکام',
  },
  en: {
    appTitle: 'Lecture Transcriber', appSub: 'Arabic + Urdu • Login to continue',
    emailLabel: 'Email address', passLabel: 'Password',
    login: 'Login', signup: 'Create account', signUp: 'Sign up',
    noAccount: 'No account?', haveAccount: 'Already have an account?',
    logout: 'Logout', newLecture: 'New recording',
    selectFile: 'Select recording', fileHint: 'm4a / mp3 / wav / opus — 1 to 4 hours',
    langInLecture: 'Language in lecture', uploadBtn: 'Upload + Transcribe',
    progress: 'Progress', myLectures: 'My lectures', noLectures: 'No lectures yet',
    emptySub: 'Upload a recording to get started',
    dlTxt: 'Download .txt', dlDoc: 'Download Word', dlPdf: 'Print PDF',
    copyTxt: 'Copy text', shareTxt: 'Share', delete: 'Delete',
    deleting: 'Deleting...', deleted: 'Deleted',
    fileTooLarge: 'File too large (max 100MB)', selectFirst: 'Select a file first',
    loginAgain: 'Login again', uploading: 'Uploading',
    processing: 'Transcribing… (~3-5 min per hour)', done: 'Done',
    error: 'Error', loaded: 'Loaded', confirmDelete: 'Delete this lecture?',
    cancel: 'Cancel', copied: 'Copied!', copyFailed: 'Copy failed',
    shareFailed: 'Share failed', transcriptionComplete: 'Transcription complete',
    transcriptionFailed: 'Transcription failed', accountCreated: 'Account created — please login',
    dropHere: 'Drop here', userMenu: 'User menu',
    langUrAr: 'Urdu + Arabic', langUr: 'Urdu only', langAr: 'Arabic only',
    langHi: 'Hindi', langGu: 'Gujarati', langMulti: 'Auto-detect',
    balance: 'Balance', balanceFailed: 'Balance load failed',
    original: 'Original', translitFailed: 'Transliteration failed',
  },
};

export function makeT(lang: AppLang) {
  return (key: keyof Strings): string => I18N[lang]?.[key] ?? I18N.en[key] ?? key;
}
