import React from 'react';
import {
  Stack,
  Text,
  mergeStyleSets,
  getTheme,
  Link,
  DefaultButton,
  Separator,
  DetailsList,
  IColumn,
  SelectionMode,
  IconButton,
  Label,
} from '@fluentui/react';

interface LicenseInformationProps {
  model_number: string;
  brand: string;
  license_status: string;
  licensee: string;
  description: string;
  cs_phone_toll_free: string;
  cs_phone_not_toll_free: string;
  website: string;
  general_cs_email: string;
}

const theme = getTheme();
const styles = mergeStyleSets({
  root: {
    maxWidth: '100%',
    padding: '12px',
  },
  header: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: theme.palette.themePrimary,
    color: theme.palette.white,
    borderRadius: '8px 8px 0 0',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  headerSubtitle: {
    fontSize: '14px',
    opacity: 0.9,
  },
  card: {
    marginBottom: '12px',
    padding: '12px',
    backgroundColor: theme.palette.white,
    boxShadow: theme.effects.elevation4,
    borderRadius: '8px',
  },
  licenseStatus: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    display: 'inline-block',
    marginBottom: '8px',
  },
  active: {
    backgroundColor: theme.palette.greenLight,
    color: theme.palette.green,
  },
  inactive: {
    backgroundColor: theme.palette.red,
    color: theme.palette.white,
  },
  pending: {
    backgroundColor: theme.palette.orange,
    color: theme.palette.white,
  },
  unknown: {
    backgroundColor: theme.palette.neutralLight,
    color: theme.palette.neutralSecondary,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
  },
  infoLabel: {
    fontWeight: '600',
    color: theme.palette.neutralPrimary,
    minWidth: '120px',
  },
  infoValue: {
    color: theme.palette.neutralSecondary,
    textAlign: 'right',
    flex: 1,
    marginLeft: '12px',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '4px',
  },
  contactButton: {
    height: '24px',
    fontSize: '11px',
    minWidth: '80px',
    background: 'radial-gradient(106.04% 106.06% at 100.1% 90.19%,#FFD20A 33.63%,#f4e6a9 100%)',
    border: 'none',
    borderRadius: '4px',
    color: '#000',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    selectors: {
      '&:hover': {
        background: 'linear-gradient(135deg,#FFD20A 33.63%,#f4e6a9 100%)',
        transform: 'translateY(-1px)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
      '&:active': {
        transform: 'translateY(0)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      }
    }
  },
  description: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: theme.palette.neutralLighter,
    borderRadius: '4px',
    borderLeft: `4px solid ${theme.palette.themePrimary}`,
  },
  noData: {
    textAlign: 'center',
    padding: '20px',
    color: theme.palette.neutralSecondary,
    fontStyle: 'italic',
  },
});

const getLicenseStatusStyle = (status: string) => {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('active') || lowerStatus.includes('valid')) {
    return styles.active;
  } else if (lowerStatus.includes('inactive') || lowerStatus.includes('expired') || lowerStatus.includes('revoked')) {
    return styles.inactive;
  } else if (lowerStatus.includes('pending') || lowerStatus.includes('processing')) {
    return styles.pending;
  } else {
    return styles.unknown;
  }
};

const LicenseInformationLayout: React.FC<{item: LicenseInformationProps}> = (props) => {
  const {
    model_number,
    brand,
    license_status,
    licensee,
    description,
    cs_phone_toll_free,
    cs_phone_not_toll_free,
    website,
    general_cs_email,
  } = props.item;

  // Check if we have any meaningful data
  const hasData = model_number || brand || license_status || licensee || description || 
                  cs_phone_toll_free || cs_phone_not_toll_free || website || general_cs_email;

  if (!hasData) {
    return (
      <Stack className={styles.root}>
        <div className={styles.card}>
          <Text className={styles.noData}>No license information available</Text>
        </div>
      </Stack>
    );
  }

  const handlePhoneClick = (phoneNumber: string) => {
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`, '_self');
    }
  };

  const handleEmailClick = (email: string) => {
    if (email) {
      window.open(`mailto:${email}`, '_self');
    }
  };

  const handleWebsiteClick = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <Stack className={styles.root}>

      {/* License Details */}
      <div className={styles.card}>
        

        {/* Product Information */}
        {(model_number || brand) && (
          <>
            <Separator>Product Information</Separator>
            {model_number && (
              <div className={styles.infoRow}>
                <Text className={styles.infoLabel}>Model Number:</Text>
                <Text className={styles.infoValue}>{model_number}</Text>
              </div>
            )}
            {brand && (
              <div className={styles.infoRow}>
                <Text className={styles.infoLabel}>Brand:</Text>
                <Text className={styles.infoValue}>{brand}</Text>
              </div>
            )}
          </>
        )}

        {/* License Status */}
        {license_status && (
             <div className={styles.infoRow}>
                <Text className={styles.infoLabel}>License Status:</Text>
                <div className={styles.infoValue}>
                    <Text className={`${styles.licenseStatus} ${getLicenseStatusStyle(license_status)}`}>
                    {license_status}
                    </Text>
                </div>
           </div>
        )}

        {/* License Information */}
        {licensee && (
          <>
            <div className={styles.infoRow}>
              <Text className={styles.infoLabel}>Licensee:</Text>
              <Text className={styles.infoValue}>{licensee}</Text>
            </div>
          </>
        )}

        {/* Description */}
        {description && (
          <div className={styles.infoRow}>
            <Text className={styles.infoLabel}>Description:</Text>
            <Text className={styles.infoValue}>{description}</Text>
          </div>
        )}

        {/* Contact Information */}
        {(cs_phone_toll_free || cs_phone_not_toll_free || website || general_cs_email) && (
          <>
            <Separator>Contact Information</Separator>
            {cs_phone_toll_free && (
              <div className={styles.infoRow}>
                <Text className={styles.infoLabel}>Toll-Free Support:</Text>
                <Text className={styles.infoValue}>{cs_phone_toll_free}</Text>
              </div>
            )}
            {cs_phone_not_toll_free && (
              <div className={styles.infoRow}>
                <Text className={styles.infoLabel}>Support Phone:</Text>
                <Text className={styles.infoValue}>{cs_phone_not_toll_free}</Text>
              </div>
            )}
            {general_cs_email && (
              <div className={styles.infoRow}>
                <Text className={styles.infoLabel}>Support Email:</Text>
                <Text className={styles.infoValue}>{general_cs_email}</Text>
              </div>
            )}
            {website && (
              <div className={styles.infoRow}>
                <Text className={styles.infoLabel}>Website:</Text>
                <Text className={styles.infoValue}>{website}</Text>
              </div>
            )}
          </>
        )}
      </div>
    </Stack>
  );
};

export default LicenseInformationLayout; 