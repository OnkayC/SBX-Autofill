import { Button } from '@mui/material';
import browser from 'webextension-polyfill';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import PasswordOutlined from '@mui/icons-material/PasswordOutlined';
import NotesOutlined from '@mui/icons-material/NotesOutlined';
import PaletteOutlined from '@mui/icons-material/PaletteOutlined';
import LanguageOutlined from '@mui/icons-material/LanguageOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SettingsPopupRulesTabPanel from './SettingsPopupRulesTabPanel';
import SettingsPreferences from '../Settings/SettingsPreferences';

export default function SettingsPopupComponent() {
  const [t] = useTranslation('global');
  const [section, setSection] = useState(0);
  const keys = ['general', 'autofill', 'inline', 'appearance', 'rules', 'about'];
  const icons = [<SettingsOutlined />, <PasswordOutlined />, <NotesOutlined />, <PaletteOutlined />, <LanguageOutlined />, <InfoOutlined />];
  return <div className="settings-shell">
    <aside className="settings-sidebar">
      <div className="settings-brand"><img src={browser.runtime.getURL('assets/icons/sbx-autofill.svg')} alt="" width={32} height={32} /><span>SBX Autofill</span></div>
      <nav className="settings-nav" aria-label={t('settings-page.navigation')}>
        {keys.map((key, i) => <Button key={key} startIcon={icons[i]} aria-current={section === i ? 'page' : undefined} onClick={() => setSection(i)}>{t(`settings-page.${key}`)}</Button>)}
      </nav>
      <footer>{t('general.version')} {process.env.VERSION}</footer>
    </aside>
    <main className="settings-main">
      <header><p>{t('settings-popup-component.title')}</p><h1>{t(`settings-page.${keys[section]}`)}</h1><p>{t(`settings-page.${keys[section]}-description`)}</p></header>
      {section === 5 ? <section aria-label={t('settings-page.about')} style={{ maxWidth: '65ch' }}>
        <h2>SBX Autofill</h2>
        <div className="settings-section"><p>{t('general.version')} {process.env.VERSION}</p></div>
        <div className="settings-section"><p>{t('settings-page.disclaimer')}</p></div>
        <p>{t('settings-page.system-theme')}</p>
      </section> : section === 4 ? <SettingsPopupRulesTabPanel value={4} index={4} /> : <SettingsPreferences section={section} />}
    </main>
  </div>;
}
