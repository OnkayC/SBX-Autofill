import { Box, List, Typography } from '@mui/material';
import React from 'react';
import { DatabaseSummary } from '../Messaging/Protocol/DatabaseSummary';
import DatabaseListItem from './DatabaseListItem';
import { useTranslation } from 'react-i18next';

export default function DatabasesListPopupComponent({ databases }: { databases: DatabaseSummary[] }) {
  const [t] = useTranslation('global');
  return <Box sx={{ width: 400 }}>
    {databases.length ? <List disablePadding sx={{ px: 1.5 }}>
      {databases.map(database => <DatabaseListItem database={database} key={database.uuid} />)}
    </List> : <Box sx={{ p: 3 }}>
      <Typography sx={{ fontWeight: 500 }}>{t('databases-list-popup-component.no-databases')}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, fontSize: '0.875rem' }}>{t('databases-list-popup-component.no-databases-message')}</Typography>
    </Box>}
    <Typography component="footer" color="text.secondary" sx={{ px: 2, py: 2.5, fontSize: '0.8125rem' }}>
      {t('popup-design.database-help', { defaultValue: 'Manage database autofill in Strongbox.' })}
    </Typography>
  </Box>;
}
