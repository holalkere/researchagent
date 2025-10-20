import React from 'react';
import {
  Stack,
  Text,
  Image,
  mergeStyleSets,
  getTheme,
  Link,
  DefaultButton,
  Separator,
  DetailsList,
  IColumn,
  SelectionMode,
} from '@fluentui/react';

interface ProductPart {
  code: string;
  name: string;
  stock_status: string;
  price: string;
  url: string;
}

interface ProductPartsProps {
  partsInfo: ProductPart[];
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
  stockStatus: {
    padding: '3px 6px',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
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
  urlButton: {
    height: '24px',
    fontSize: '11px',
    minWidth: '80px',
  },
  noParts: {
    textAlign: 'center',
    padding: '20px',
    color: theme.palette.neutralSecondary,
    fontStyle: 'italic',
  },
});

const getStockStatusStyle = (status: string) => {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('in stock') || lowerStatus.includes('available') || lowerStatus.includes("instock")) {
    return styles.inStock;
  } else if (lowerStatus.includes('out of stock') || lowerStatus.includes('unavailable') || lowerStatus.includes("outofstock")) {
    return styles.outOfStock;
  } else if (lowerStatus.includes('low stock') || lowerStatus.includes('limited')) {
    return styles.lowStock;
  } else {
    return styles.unknownStock;
  }
};

const ProductPartsLayout: React.FC<{item: ProductPartsProps}> = (props) => {
  const { partsInfo } = props.item;

  if (!partsInfo || partsInfo.length === 0) {
    return (
      <Stack className={styles.root}>
        <div className={styles.card}>
          <Text className={styles.noParts}>No parts information available</Text>
        </div>
      </Stack>
    );
  }

  const columns: IColumn[] = [
    {
        key: 'code',
        name: 'Part#',
        fieldName: 'code',
        minWidth: 60,
        maxWidth: 80,
        isResizable: true,
    },
    {
      key: 'name',
      name: 'Name',
      fieldName: 'name',
      minWidth: 150,
      maxWidth: 200,
      isResizable: true,
    },
    {
      key: 'price',
      name: 'Price',
      fieldName: 'price',
      minWidth: 60,
      maxWidth: 100,
      isResizable: true,
    },
    {
      key: 'stock_status',
      name: 'Stock Status',
      fieldName: 'stock_status',
      minWidth: 60,
      maxWidth: 80,
      isResizable: true,
    },
    {
      key: 'url',
      name: 'Actions',
      fieldName: 'url',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true,
    },
  ];

  const items = partsInfo.map((part, index) => ({
    key: index.toString(),
    name: part.name,
    code: part.code,
    price: part.price || 'N/A',
    stock_status: part.stock_status || 'Unknown',
    url: part.url,
    originalPart: part, // Keep reference to original part for actions
  }));

  const onRenderItemColumn = (item?: any, index?: number, column?: IColumn) => {
    if (!item || !column) return null;
    
    const fieldContent = item[column.fieldName as keyof typeof item];

    switch (column.key) {
      case 'stock_status':
        return (
          <Text 
            className={`${styles.stockStatus} ${getStockStatusStyle(fieldContent)}`}
          >
            {fieldContent}
          </Text>
        );
      case 'price':
        return (
          <Text style={{ color: 'black', fontWeight: 'bold' }}>
            {fieldContent}
          </Text>
        );
      case 'url':
        return fieldContent ? (
          <Link
            href={fieldContent}
            target="_blank"
            className={styles.urlButton}
          >
            View Part
          </Link>
        ) : (
          <Text style={{ color: theme.palette.neutralSecondary }}>N/A</Text>
        );
      default:
        return <Text>{fieldContent}</Text>;
    }
  };

  return (
    <Stack className={styles.root}>

      {/* Parts DetailsList */}
      <div className={styles.card}>
        <DetailsList
          items={items}
          columns={columns}
          selectionMode={SelectionMode.none}
          isHeaderVisible={true}
          compact={true}
          onRenderItemColumn={onRenderItemColumn}
        />
      </div>
    </Stack>
  );
};

export default ProductPartsLayout; 