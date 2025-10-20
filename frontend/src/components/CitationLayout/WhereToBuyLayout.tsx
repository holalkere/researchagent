import React from 'react';
import {
  Stack,
  Text,
  mergeStyleSets,
  getTheme,
  Link,
  DefaultButton,
  Icon,
  Separator,
  DetailsList,
  IColumn,
  SelectionMode,
} from '@fluentui/react';

interface WhereToBuyProps {
  redirect_id: string | null;
  redirect_date: string | null;
  country_code: string | null;
  retailer: string | null;
  module: string | null;
  config_id: string | null;
  widget_type: string | null;
  sku: string | null;
  product_name: string | null;
  brand_name: string | null;
  brand_id: string | null;
  referrer: string | null;
  traceback_id: string | null;
  traceback_id_param: string | null;
  url: string | null;
  utid: string | null;
  ut_param: string | null;
  price: string | null;
  price_usd: string | null;
  currency_code: string | null;
  stock_status: string | null;
}

const theme = getTheme();
const styles = mergeStyleSets({
  root: {
    maxWidth: '100%',
    padding: '12px',
  },
  card: {
    marginBottom: '12px',
    padding: '12px',
    backgroundColor: theme.palette.white,
    boxShadow: theme.effects.elevation4,
    borderRadius: '8px',
  },
  retailerName: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: theme.palette.themePrimary,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: `1px solid ${theme.palette.neutralLight}`,
  },
  infoRowLast: {
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
  },
  stockStatus: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    display: 'inline-block',
  },
  inStock: {
    backgroundColor: theme.palette.greenLight,
    color: theme.palette.green,
  },
  outOfStock: {
    backgroundColor: theme.palette.red,
    color: theme.palette.white,
  },
  lowStock: {
    backgroundColor: theme.palette.orange,
    color: theme.palette.white,
  },
  unknownStock: {
    backgroundColor: theme.palette.neutralLight,
    color: theme.palette.neutralSecondary,
  },
  priceValue: {
    color: theme.palette.themePrimary,
    fontWeight: 'bold',
  },
  urlButton: {
    height: '24px',
    fontSize: '11px',
    minWidth: '80px',
  },
  noData: {
    textAlign: 'center',
    padding: '20px',
    color: theme.palette.neutralSecondary,
    fontStyle: 'italic',
  },
  detailsListContainer: {
    '& .ms-DetailsList': {
      '& .ms-DetailsRow': {
        '& .ms-DetailsRow-cell': {
          whiteSpace: 'normal !important',
          wordWrap: 'break-word',
          overflow: 'visible !important',
          textOverflow: 'unset !important',
        },
      },
    },
  },
});

const getStockStatusStyle = (status: string | null) => {
  if (!status) return styles.unknownStock;
  
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('in stock') || lowerStatus.includes('available') || lowerStatus.includes('instock')) {
    return styles.inStock;
  } else if (lowerStatus.includes('out of stock') || lowerStatus.includes('unavailable') || lowerStatus.includes('outofstock')) {
    return styles.outOfStock;
  } else if (lowerStatus.includes('low stock') || lowerStatus.includes('limited')) {
    return styles.lowStock;
  } else {
    return styles.unknownStock;
  }
};

const formatPrice = (price: string | null, currency: string | null) => {
  if (!price) return 'Price not available';
  
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency || '';
  return `${currencySymbol}${price}`;
};

const WhereToBuyLayout: React.FC<{item: WhereToBuyProps}> = (props) => {
  const { item } = props;

  // Check if we have essential data
  if (!item.retailer && !item.url && !item.product_name) {
    return (
      <Stack className={styles.root}>
        <div className={styles.card}>
          <Text className={styles.noData}>No retailer information available</Text>
        </div>
      </Stack>
    );
  }

  // Define columns for the DetailsList
  const columns: IColumn[] = [
    {
      key: 'specification',
      name: 'Specification',
      fieldName: 'specification',
      minWidth: 150,
      maxWidth: 200,
    },
    {
      key: 'value',
      name: 'Value',
      fieldName: 'value',
      minWidth: 200,
      maxWidth: 400,
    },
  ];

  // Helper function to format specification names
  const formatSpecificationName = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Helper function to format values
  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }

    // Special handling for price
    if (key === 'price') {
      return formatPrice(value, item.currency_code);
    }

    // For store link, we'll handle it separately outside DetailsList
    if (key === 'store_link') {
      return 'Click button below';
    }

    return String(value);
  };

  // Build the items array for DetailsList
  const items: Array<{key: string, specification: string, value: any}> = [];

  // Add items only if they have values
  if (item.product_name) {
    items.push({
      key: 'product',
      specification: 'Product',
      value: item.product_name
    });
  }

  if (item.brand_name) {
    items.push({
      key: 'brand',
      specification: 'Brand',
      value: item.brand_name
    });
  }

  if (item.sku) {
    items.push({
      key: 'sku',
      specification: 'SKU',
      value: item.sku
    });
  }

  if (item.price) {
    items.push({
      key: 'price',
      specification: 'Price',
      value: formatValue('price', item.price)
    });
  }

  if (item.price_usd && item.price_usd !== item.price) {
    items.push({
      key: 'price_usd',
      specification: 'USD Price',
      value: `$${item.price_usd}`
    });
  }

  if (item.stock_status) {
    items.push({
      key: 'stock_status',
      specification: 'Stock Status',
      value: formatValue('stock_status', item.stock_status)
    });
  }

  if (item.country_code) {
    items.push({
      key: 'country',
      specification: 'Country',
      value: item.country_code
    });
  }

  if (item.redirect_date) {
    items.push({
      key: 'date',
      specification: 'Date',
      value: new Date(item.redirect_date).toLocaleDateString()
    });
  }

  // Store Link is handled separately outside DetailsList

  return (
    <Stack className={styles.root}>
      <div className={styles.card}>
        {/* Retailer Name */}
        <Text className={styles.retailerName}>
          {item.retailer || 'Unknown Retailer'}
        </Text>

        {/* DetailsList for harmonized table format */}
        <div className={styles.detailsListContainer}>
          <DetailsList
            items={items}
            columns={columns}
            selectionMode={SelectionMode.none}
            isHeaderVisible={true}
            compact={true}
          />
        </div>

        {/* Store Link Button - rendered outside DetailsList */}
        {item.url && (
          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <Link href={item.url} target="_blank" rel="noopener noreferrer">
              <DefaultButton
                className={styles.urlButton}
                iconProps={{ iconName: 'OpenInNewWindow' }}
                text="Visit Store"
              />
            </Link>
          </div>
        )}
      </div>
    </Stack>
  );
};

export default WhereToBuyLayout;
