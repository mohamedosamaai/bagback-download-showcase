import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type SettingItem = {
  title: string;
  description: string;
};

const settings: SettingItem[] = [
  { title: 'عام', description: 'اللغة، الإشعارات، وسلوك التطبيق' },
  { title: 'مدير الملفات', description: 'المجلدات، السجل، والتنظيم' },
  { title: 'الصوت والفيديو', description: 'الجودة والصيغ المتاحة' },
  { title: 'الشبكة', description: 'الاتصال، الحدود، وإعادة المحاولة' },
  { title: 'الأوامر المتقدمة', description: 'خيارات للمستخدمين الخبراء' },
  { title: 'المظهر', description: 'الوضع الفاتح والداكن وهوية Bagback' },
  { title: 'الواجهة', description: 'تجربة عربية وإنجليزية بسيطة' },
  { title: 'نبذة', description: 'الروابط، الملكية، والدعم' }
];

function App() {
  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">Bagback Tech</p>
        <h1>Bagback Download</h1>
        <p>
          صنع بحب للمستخدمين بدون أرباح، من شركة Bagback Tech بيد المطور Mohamed Osama.
        </p>
        <div className="input-row">
          <input aria-label="URL" placeholder="ضع الرابط هنا" />
          <button>تحليل</button>
        </div>
        <small>استخدم التطبيق فقط مع المحتوى المسموح لك بحفظه.</small>
      </section>

      <section className="settings-card">
        <h2>الإعدادات</h2>
        <div className="settings-list">
          {settings.map((item) => (
            <article className="setting-item" key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="links-card">
        <h2>روابط Bagback</h2>
        <a href="https://bagbacktech.com">Bagbacktech.com</a>
        <a href="https://elitk.com">Elitk.com</a>
        <a href="https://ai.bagbacktech.com">ai.bagbacktech.com</a>
        <a href="https://mohamedosama.me">Mohamedosama.me</a>
        <span>@Mohamedosamaai</span>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
