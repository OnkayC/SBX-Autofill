import * as React from 'react';
import { Alert, Box, Button, CircularProgress, CssBaseline, IconButton, Snackbar, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { SettingsOutlined } from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import browser from 'webextension-polyfill';
import { useTranslation } from 'react-i18next';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import CurrentTabCredentialsComponent from './CurrentTabCredentials';
import DatabasesListPopupComponent from './DatabasesListPopupComponent';
import NotRunningPopupComponent from './NotRunningPopupComponent';
import { NativeAppApi } from '../Messaging/NativeAppApi';
import { DatabaseSummary } from '../Messaging/Protocol/DatabaseSummary';
import { useCustomStyle } from '../Contexts/CustomStyleContext';
import { SettingsStore } from '../Settings/SettingsStore';

export default function PopupComponent() {
  const [t] = useTranslation('global');
  const { getCustomStyle } = useCustomStyle();
  const baseTheme = createTheme(getCustomStyle());
  const dark = baseTheme.palette.mode === 'dark';
  const theme = createTheme(baseTheme, {
    palette: {
      primary: { main: dark ? '#399dff' : '#0875db' },
      background: { default: dark ? '#111827' : '#ffffff', paper: dark ? '#182131' : '#f4f6f9' },
      text: { primary: dark ? '#e5eaf2' : '#172033', secondary: dark ? '#a6b3c7' : '#5c6676' },
      divider: dark ? '#334155' : '#dce3ed',
    },
    components: { MuiButton: { styleOverrides: { root: { textTransform: 'none', boxShadow: 'none' } } } },
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [databases, setDatabases] = React.useState<DatabaseSummary[]>([]);
  const [selectedTab, setSelectedTab] = React.useState(1);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastError, setToastError] = React.useState(false);
  const unlocked = databases.some(database => !database.locked && database.autoFillEnabled);
  const showToast = (message: string) => { setToastError(false); setToastMessage(message); };

  React.useEffect(() => {
    let active = true;
    async function load() {
      try {
        const status = await NativeAppApi.getInstance().getStatus();
        if (!active) return;
        if (!status) { setError(true); return; }
        setDatabases(status.databases);
        setSelectedTab(status.databases.some(database => !database.locked && database.autoFillEnabled) ? 0 : 1);
      } catch { if (active) setError(true); }
      finally { if (active) setLoading(false); }
    }
    void load();
    void initScrollbars().catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function initScrollbars() {
    const stored = await SettingsStore.getSettings();

    if (!stored.showScrollbars) {
      const styleElement = document.createElement('style');

      const cssRules = `
            div::-webkit-scrollbar { width: 0; display: none; } 
            div { overflow: -moz-scrollbars-none; -ms-overflow-style: none; scrollbar-width: none; }`;

      styleElement.innerHTML = cssRules;
      styleElement.id = 'hide-scrollbar-style';
      document.head.appendChild(styleElement);
    } else {
      const styleElementsToRemove = document.querySelectorAll('style#hide-scrollbar-style');

      styleElementsToRemove.forEach(element => {
        element.remove();
      });
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minWidth: 400, width: 'max-content', maxWidth: 780, bgcolor: 'background.default', color: 'text.primary' }}>
        <Box component="header" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Box component="img" src={browser.runtime.getURL('assets/icons/sbx-autofill.svg')} alt="" sx={{ width: 24, height: 24 }} />
          <Typography component="h1" sx={{ fontWeight: 700, fontSize: '1rem', flexGrow: 1 }}>SBX Autofill</Typography>
          <Tooltip title={t('popup-design.settings', { defaultValue: 'Settings' })}>
            <IconButton aria-label={t('popup-design.settings', { defaultValue: 'Settings' })} size="small" onClick={() => {
              void browser.runtime.openOptionsPage().then(() => window.close()).catch(() => {
                setToastError(true); setToastMessage(t('settings-popup-component.open-error'));
              });
            }}><SettingsOutlined /></IconButton>
          </Tooltip>
        </Box>
        <Tabs value={selectedTab} onChange={(_event, value) => setSelectedTab(value)} aria-label={t('popup-design.navigation', { defaultValue: 'Popup navigation' })} sx={{ px: 1, borderBottom: 1, borderColor: 'divider', minHeight: 44, '& .MuiTab-root': { textTransform: 'none', minHeight: 44, fontSize: '0.875rem' } }}>
          <Tab id="popup-logins-tab" aria-controls="popup-panel" label={t('popup-design.logins', { defaultValue: 'Logins' })} />
          <Tab id="popup-databases-tab" aria-controls="popup-panel" label={t('databases-list-popup-component.title')} />
        </Tabs>
        <Box role="tabpanel" id="popup-panel" aria-labelledby={selectedTab === 0 ? 'popup-logins-tab' : 'popup-databases-tab'} sx={{ maxHeight: 480, overflowY: 'auto' }}>
          {loading ? <Box role="status" sx={{ p: 4, display: 'flex', justifyContent: 'center', gap: 1.5 }}><CircularProgress size={18} />{t('general.loading')}</Box>
            : error ? <NotRunningPopupComponent onRefresh={() => window.close()} />
            : selectedTab === 1 ? <DatabasesListPopupComponent databases={databases} />
            : !unlocked ? <Box sx={{ p: 3, width: 400 }}>
              <Typography sx={{ fontWeight: 500 }}>{t('popup-design.unlock-title', { defaultValue: 'Unlock a database to see logins' })}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1, mb: 2, fontSize: '0.875rem' }}>{t('popup-design.unlock-help', { defaultValue: 'Choose a database with autofill enabled in Strongbox.' })}</Typography>
              <Button variant="outlined" onClick={() => setSelectedTab(1)}>{t('databases-list-popup-component.title')}</Button>
            </Box>
            : <CurrentTabCredentialsComponent initScrollbars={initScrollbars} showToast={showToast} />}
        </Box>
        <Snackbar open={Boolean(toastMessage)} autoHideDuration={4000} onClose={() => setToastMessage('')}>
          <Alert severity={toastError ? 'error' : 'success'} onClose={() => setToastMessage('')}>{toastMessage}</Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
