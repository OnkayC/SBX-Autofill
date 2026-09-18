import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, Container } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import i18next from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { config } from '../Localization/config';
import { CustomStyleProvider, useCustomStyle } from '../Contexts/CustomStyleContext';
import SettingsPopupComponent from '../Popup/SettingsPopupComponent';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';

function OptionsPage() {
  const { getCustomStyle } = useCustomStyle();
  return (
    <ThemeProvider theme={createTheme(getCustomStyle())}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 5 } }}>
        <SettingsPopupComponent />
      </Container>
    </ThemeProvider>
  );
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
