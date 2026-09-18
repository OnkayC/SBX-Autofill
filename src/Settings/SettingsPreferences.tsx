import React, { useEffect, useState } from 'react';
import { Alert, Button, MenuItem, TextField, Switch } from '@mui/material';
import browser from 'webextension-polyfill';
import { useTranslation } from 'react-i18next';
import { Settings } from './Settings';
import { SettingsStore } from './SettingsStore';
import { languages } from '../Localization/config';
import { FontSize, LightOrDarkAppearance, Spacing, useCustomStyle } from '../Contexts/CustomStyleContext';

type BooleanKey = 'showMatchCountOnPopupBadge' | 'hideCredentialDetailsOnPopup' | 'showScrollbars' | 'autoFillImmediatelyIfOnlyASingleMatch' | 'autoFillImmediatelyWithFirstMatch' | 'showInlineIconAndPopupMenu' | 'hideCredentialDetailsOnInlineMenu';
type ExclusionKey = 'doNotFillOnDomains' | 'doNotShowInlineMenusOnDomains' | 'doNotShowInlineMenusOnPages';

export default function SettingsPreferences({ section }: { section: number }) {
  const [t, i18n] = useTranslation('global');
  const label = (key: string, fallback: string) => t(`settings-page.${key}`, { defaultValue: fallback });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [commands, setCommands] = useState<browser.Commands.Command[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [domains, setDomains] = useState<Partial<Record<ExclusionKey, string>>>({});
  const style = useCustomStyle();
  useEffect(() => {
    void SettingsStore.getSettings().then(setSettings).catch(e => setError(String(e)));
    void browser.commands.getAll().then(setCommands).catch(e => setError(String(e)));
  }, []);
  useEffect(() => { setDomains({}); setError(''); }, [section]);
  const update = async (change: (next: Settings) => void) => {
    setBusy(true);
    try {
      const next = await SettingsStore.getSettings();
      change(next);
      await SettingsStore.setSettings(next);
      setSettings(next);
      setError('');
      return true;
    } catch (e) { setError(String(e)); return false; } finally { setBusy(false); }
  };
  if (!settings) return <p role="status">{error || label('loading', 'Loading settings…')}</p>;
  const toggle = (key: BooleanKey, title: string, description: string) => <div className="settings-row" key={key}>
    <div><span>{label(key, title)}</span><p>{label(`${key}-help`, description)}</p></div>
    <Switch checked={settings[key]} disabled={busy} inputProps={{ 'aria-label': label(key, title) }} onChange={(_, checked) => void update(next => { next[key] = checked; })} />
  </div>;
  const exclusions = (key: ExclusionKey, pages = false) => <section style={{ marginTop: 36 }}>
    <h2>{label(key, pages ? 'Excluded pages' : 'Excluded sites')}</h2>
    <p>{label(`${key}-help`, pages ? 'Hide the inline menu on specific pages.' : 'Turn off this automatic behavior for these sites.')}</p>
    {settings[key].map(value => <div className="settings-row" key={value}><span>{value}</span><Button disabled={busy} onClick={() => void update(next => { next[key] = next[key].filter(item => item !== value); })}>{label('remove', 'Remove')}</Button></div>)}
    <form className="settings-actions" onSubmit={event => {
      event.preventDefault();
      const domain = domains[key] || '';
      let url: URL;
      try { url = new URL(domain.includes('://') ? domain : `https://${domain}`); if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error(); }
      catch { setError(label('invalid-site', 'Enter a valid website address.')); return; }
      const value = pages ? Settings.prepUrlPageForDoNotRunList(url.href) : Settings.prepUrlForDoNotRunList(url.href);
      void update(next => { next[key] = [...new Set([...next[key], value])]; }).then(saved => { if (saved) setDomains(previous => ({ ...previous, [key]: '' })); });
    }}>
      <TextField sx={{ flex: 1, minWidth: 180 }} label={label(pages ? 'page-address' : 'site-address', pages ? 'Page address' : 'Website address')} value={domains[key] || ''} onChange={e => setDomains(previous => ({ ...previous, [key]: e.target.value }))} placeholder={pages ? 'https://example.com/login' : 'example.com'} />
      <Button variant="outlined" type="submit" disabled={busy || !domains[key]?.trim()}>{label('add-exclusion', 'Add exclusion')}</Button>
    </form>
  </section>;
  return <>{error && <Alert severity="error">{error}</Alert>}<div className="settings-columns"><div>
    {section === 0 && <>
      <h2>{label('language', 'Language')}</h2>
      <div className="settings-row"><div><span>{label('interface-language', 'Interface language')}</span><p>{label('language-help', 'Use your browser language or choose one below.')}</p></div>
        <TextField select fullWidth={false} sx={{ width: 220, flexShrink: 0 }} SelectProps={{ displayEmpty: true }} value={settings.lng || ''} disabled={busy} inputProps={{ 'aria-label': label('language', 'Language') }} onChange={e => { const lng = e.target.value; void update(next => { next.lng = lng; }).then(saved => { if (saved) void i18n.changeLanguage(lng || navigator.language.split('-')[0]); }); }}>
          <MenuItem value="">{label('automatic', 'Automatic')}</MenuItem>{languages.map(lng => <MenuItem key={lng} value={lng}>{new Intl.DisplayNames([lng], { type: 'language' }).of(lng) || lng}</MenuItem>)}
        </TextField></div>
      <h2 style={{ marginTop: 32 }}>{label('popup', 'Extension popup')}</h2>
      {toggle('showMatchCountOnPopupBadge', 'Show match count', 'Display the number of matching logins on the extension icon.')}
      {toggle('hideCredentialDetailsOnPopup', 'Hide credential details', 'Keep credential details hidden in the popup.')}
      {toggle('showScrollbars', 'Show scrollbars', 'Keep scrollbars visible in extension views.')}
      <section style={{ marginTop: 32 }}><h2>{t('shortcuts.title')}</h2>{commands.filter(c => c.shortcut).map(c => <div key={c.name} className="settings-row"><span>{t(`shortcuts.${c.name}`, { defaultValue: c.description || c.name || '' })}</span><kbd className="settings-code" style={{ margin: 0, padding: '6px 12px' }}>{c.shortcut}</kbd></div>)}</section>
    </>}
    {section === 1 && <><h2>{label('on-page-load', 'When a page loads')}</h2>
      {toggle('autoFillImmediatelyIfOnlyASingleMatch', 'Fill a single match automatically', 'Fill when only one matching login is available.')}
      {toggle('autoFillImmediatelyWithFirstMatch', 'Fill the first match automatically', 'Use the first matching login even when several are available.')}
      {exclusions('doNotFillOnDomains')}
    </>}
    {section === 2 && <><h2>{label('inline-behavior', 'In-page controls')}</h2>
      {toggle('showInlineIconAndPopupMenu', 'Show inline menu', 'Show the autofill icon and menu inside website fields.')}
      {toggle('hideCredentialDetailsOnInlineMenu', 'Hide credential details', 'Keep credential details hidden in the inline menu.')}
      {exclusions('doNotShowInlineMenusOnDomains')}{exclusions('doNotShowInlineMenusOnPages', true)}
    </>}
    {section === 3 && <><h2>{label('settings-appearance', 'Settings appearance')}</h2><div className="settings-row"><div><span>{label('system-theme', 'Appearance follows your system')}</span><p>{label('system-theme-help', 'This page switches between light and dark when your system changes.')}</p></div></div>
      <h2 style={{ marginTop: 32 }}>{label('extension-appearance', 'Popup and inline menu')}</h2>
      {[{ key: 'lightOrDarkAppearance' as const, title: 'Theme', options: [[LightOrDarkAppearance.system, 'System'], [LightOrDarkAppearance.light, 'Light'], [LightOrDarkAppearance.dark, 'Dark']] }, { key: 'fontSize' as const, title: 'Text size', options: [[FontSize.small, 'Small'], [FontSize.medium, 'Medium'], [FontSize.large, 'Large'], [FontSize.xl, 'Extra large']] }, { key: 'spacing' as const, title: 'Spacing', options: [[Spacing.small, 'Compact'], [Spacing.medium, 'Comfortable'], [Spacing.large, 'Spacious']] }].map(field => <div className="settings-row" key={field.key}><span>{label(field.key, field.title)}</span><TextField select fullWidth={false} sx={{ width: 220, flexShrink: 0 }} disabled={busy} value={settings[field.key]} inputProps={{ 'aria-label': label(field.key, field.title) }} onChange={event => { const value = Number(event.target.value); void update(next => { next[field.key] = value; }).then(saved => { if (!saved) return; if (field.key === 'fontSize') style.setFontSize(value); else if (field.key === 'spacing') style.setSpacing(value); else if (value === LightOrDarkAppearance.system) style.switchToSystemMode(); else style.toggleDarkMode(value === LightOrDarkAppearance.dark); }); }}>{field.options.map(([value, name]) => <MenuItem value={value} key={value}>{label(String(name).toLowerCase().replace(' ', '-'), String(name))}</MenuItem>)}</TextField></div>)}
    </>}
    </div><aside className="settings-help"><h2>{label('about-preferences', 'About these settings')}</h2><p>{label('saved-automatically', 'Preferences are saved automatically. Site rules are saved separately when you choose Add rule or Save changes.')}</p><section><h3>{label('local-rules', 'Site-specific behavior')}</h3><p>{label('local-rules-help', 'Use Site rules when a website needs custom field selectors. Rules apply only to the origins and paths you configure.')}</p></section></aside></div></>;
}
