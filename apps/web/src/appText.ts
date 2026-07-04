export const appText = {
  ar: {
    brandOwner: 'Bagback Tech',
    appName: 'Bagback Download',
    tagline: 'صنع بحب للمستخدمين بدون أرباح، من شركة Bagback Tech بيد المطور Mohamed Osama.',
    inputPlaceholder: 'ضع الرابط هنا',
    analyze: 'تحليل',
    responsibility: 'استخدم التطبيق فقط مع المحتوى المسموح لك بحفظه.',
    settings: 'الإعدادات',
    links: 'روابط Bagback'
  },
  en: {
    brandOwner: 'Bagback Tech',
    appName: 'Bagback Download',
    tagline: 'Made with love for users, without profit. Built by Bagback Tech by developer Mohamed Osama.',
    inputPlaceholder: 'Paste link here',
    analyze: 'Analyze',
    responsibility: 'Use the app only with content you are allowed to save.',
    settings: 'Settings',
    links: 'Bagback Links'
  }
} as const;

export type AppLocale = keyof typeof appText;
