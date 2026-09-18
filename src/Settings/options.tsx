import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, useMediaQuery } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import i18next from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { config } from '../Localization/config';
import { CustomStyleProvider } from '../Contexts/CustomStyleContext';
import SettingsPopupComponent from '../Popup/SettingsPopupComponent';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import './settings.css';

function OptionsPage() {
  const dark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = React.useMemo(() => createTheme({
    palette: { mode: dark ? 'dark' : 'light', primary: { main: dark ? '#409dff' : '#087aeb' }, background: { default: dark ? '#111827' : '#ffffff', paper: dark ? '#182131' : '#ffffff' }, text: { primary: dark ? '#e5eaf2' : '#122139', secondary: dark ? '#a6b3c7' : '#647795' } },
    typography: { fontFamily: 'Roboto, sans-serif', fontSize: 14, button: { textTransform: 'none', fontWeight: 500 } },
    shape: { borderRadius: 6 },
    components: { MuiButton: { defaultProps: { disableElevation: true } }, MuiTextField: { defaultProps: { size: 'small', fullWidth: true } } }
  }), [dark]);
  return <ThemeProvider theme={theme}><CssBaseline /><SettingsPopupComponent /></ThemeProvider>;
}

void i18next.init(config).then(() => {
  ReactDOM.createRoot(document.getElementById('options-root') as HTMLElement).render(
    <React.StrictMode>
      <I18nextProvider i18n={i18next}>
        <CustomStyleProvider><OptionsPage /></CustomStyleProvider>
      </I18nextProvider>
    </React.StrictMode>
  );
});
