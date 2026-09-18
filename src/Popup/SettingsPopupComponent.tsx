import { Box, Tab, Tabs, Typography, useMediaQuery, useTheme } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsPopupStyleTabPanel from './SettingsPopupStyleTabPanel';
import SettingsPopupGeneralTabPanel from './SettingsPopupGeneralTabPanel';
import SettingsPopupFillTabPanel from './SettingsPopupFillTabPanel';
import SettingsPopupInlineMenuTabPanel from './SettingsPopupInlineMenuTabPanel';
import SettingsPopupRulesTabPanel from './SettingsPopupRulesTabPanel';

function SettingsPopupComponent() {
  const [t] = useTranslation('global');
  return (
    <Box component="main">
      <Typography variant="h4" component="h1">{t('settings-popup-component.title')}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>
        SBX Autofill · {t('general.version')} {process.env.VERSION}
      </Typography>
      <VerticalTabs />
    </Box>
  );
}

function a11yProps(index: number) {
  return {
    id: `vertical-tab-${index}`,
    'aria-controls': `vertical-tabpanel-${index}`
  };
}

function VerticalTabs() {
  const [t] = useTranslation('global');
  const [value, setValue] = React.useState(0);
  const compact = useMediaQuery(useTheme().breakpoints.down('sm'));

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ bgcolor: 'background.paper', display: 'flex', flexDirection: compact ? 'column' : 'row', gap: 3, '& > [role=tabpanel]': { flex: 1, minWidth: 0 } }}>
      <Tabs orientation={compact ? 'horizontal' : 'vertical'} variant="scrollable" value={value} onChange={handleChange} aria-label="Settings tabs" sx={{ borderRight: compact ? 0 : 1, borderBottom: compact ? 1 : 0, borderColor: 'divider', minWidth: compact ? 0 : 190 }}>
        <Tab label={t('settings-popup-component.title-tab1')} {...a11yProps(0)} />
        <Tab label={t('settings-popup-component.title-tab2')} {...a11yProps(1)} />
        <Tab label={t('settings-popup-component.title-tab3')} {...a11yProps(2)} />
        <Tab label={t('settings-popup-component.title-tab4')} {...a11yProps(3)} />
        <Tab label={t('settings-popup-component.title-tab5')} {...a11yProps(4)} />
      </Tabs>

      <SettingsPopupGeneralTabPanel value={value} index={0} />
      <SettingsPopupFillTabPanel value={value} index={1} />
      <SettingsPopupInlineMenuTabPanel value={value} index={2} />
      <SettingsPopupStyleTabPanel value={value} index={3} />
      <SettingsPopupRulesTabPanel value={value} index={4} />
    </Box>
  );
}

export default SettingsPopupComponent;
