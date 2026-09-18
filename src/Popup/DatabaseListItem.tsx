import * as React from 'react';
import { Alert, Box, Button, ListItem, Typography } from '@mui/material';
import { LockOutlined, LockOpenOutlined, StorageOutlined } from '@mui/icons-material';
import { DatabaseSummary } from '../Messaging/Protocol/DatabaseSummary';
import { NativeAppApi } from '../Messaging/NativeAppApi';
import { BackgroundManager } from '../Background/BackgroundManager';
import { useTranslation } from 'react-i18next';

export default function DatabaseListItem({ database }: { database: DatabaseSummary }) {
  const [t] = useTranslation('global');
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const action = database.locked ? t('database-list-item.unlock') : t('database-list-item.lock');
  const onAction = async () => {
    setBusy(true); setFailed(false);
    try {
      const api = NativeAppApi.getInstance();
      if (database.locked) {
        if (!(await api.unlockDatabase(database.uuid))?.success) throw new Error('Unlock failed');
      } else if (!(await api.lockDatabase(database.uuid))) {
        throw new Error('Lock failed');
      }
      await BackgroundManager.getInstance().restoreFocus();
      window.close();
    } catch { setFailed(true); }
    finally { setBusy(false); }
  };
  return <ListItem disableGutters sx={{ display: 'block', px: 1, py: 2, borderBottom: 1, borderColor: 'divider' }}>
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
      <Box sx={{ color: 'text.secondary', display: 'flex' }}>
        {!database.autoFillEnabled ? <StorageOutlined /> : database.locked ? <LockOutlined /> : <LockOpenOutlined color="success" />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography title={database.nickName} noWrap sx={{ fontSize: '0.9375rem', fontWeight: 500 }}>{database.nickName}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.25, fontSize: '0.8125rem' }}>
          {database.autoFillEnabled ? t(database.locked ? 'database-list-item.locked' : 'database-list-item.unlocked') : t('popup-design.autofill-disabled', { defaultValue: 'Autofill disabled' })}
        </Typography>
      </Box>
      {database.autoFillEnabled && <Button variant="outlined" size="small" disabled={busy} aria-label={`${action} ${database.nickName}`} onClick={onAction}>{action}</Button>}
    </Box>
    {failed && <Alert severity="error" sx={{ mt: 1 }}>{t('popup-design.database-error', { defaultValue: 'Could not update the database. Please try again.' })}</Alert>}
  </ListItem>;
}
