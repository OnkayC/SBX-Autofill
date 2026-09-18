import { Alert, Typography, Box, Button } from '@mui/material';
import React from 'react';
import { RocketLaunchOutlined, SensorsOffOutlined } from '@mui/icons-material';
import { NativeAppApi } from '../Messaging/NativeAppApi';
import { Utils } from '../Utils';
import { useTranslation } from 'react-i18next';

export default function NotRunningPopupComponent({ onRefresh }: { onRefresh: () => void }) {
  const [t] = useTranslation('global');
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const launch = async () => {
    setBusy(true); setFailed(false);
    try {
      if (!(await NativeAppApi.getInstance().launchStrongbox())) throw new Error('Launch failed');
      onRefresh();
    }
    catch { setFailed(true); }
    finally { setBusy(false); }
  };
  return <Box sx={{ width: 400, p: 2.5 }}>
    <SensorsOffOutlined color="action" sx={{ mb: 1 }} />
    <Typography component="h2" sx={{ fontSize: '1.125rem', fontWeight: 500 }}>{t('not-running-popup-component.title')}</Typography>
    {Utils.isMacintosh() ? <>
      <Button variant="outlined" startIcon={<RocketLaunchOutlined />} disabled={busy} onClick={launch} sx={{ my: 2 }}>{t('not-running-popup-component.launch-strongbox')}</Button>
      {failed && <Alert severity="error">{t('popup-design.launch-error', { defaultValue: 'Could not launch Strongbox. Open it from Applications and try again.' })}</Alert>}
      <Box component="details" sx={{ mt: 1, fontSize: '0.8125rem', color: 'text.secondary', '& summary': { cursor: 'pointer', color: 'text.primary' }, '& p': { my: 1 } }}>
        <summary>{t('not-running-popup-component.troubleshooting.title')}</summary>
        <p>{t('not-running-popup-component.troubleshooting.message1')}</p>
        <p>{t('not-running-popup-component.troubleshooting.message2')}</p>
        <p>{t('not-running-popup-component.troubleshooting.message3')}</p>
        <p>{t('not-running-popup-component.troubleshooting.settings-path')}</p>
      </Box>
    </> : <Typography color="text.secondary" sx={{ mt: 2 }}>{t('not-running-popup-component.message')}</Typography>}
  </Box>;
}
