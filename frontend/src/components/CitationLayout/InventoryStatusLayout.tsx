import React from 'react';
import {
  Stack,
  Text,
  DetailsList,
  IColumn,
  SelectionMode,
  mergeStyleSets,
  getTheme,
} from '@fluentui/react';

interface PlantData {
  ItemNumber?: string;
  ItemDescription?: string;
  ItemType?: string;
  Plant?: string;
  AmountInStock?: string;
  Division?: string;
  DivisionDesc?: string;
  ProdAllocation?: string;
  ItemStatus?: string;
  StatusDescription?: string;
}

interface InventoryStatusProps {
  material: string;
  plant_number: string;
  plant_data: PlantData;
  total_plants_checked?: number;
  plant_name?: string;
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
  recordContainer: {
    backgroundColor: theme.palette.neutralLighterAlt,
    border: `1px solid ${theme.palette.neutralLight}`,
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  recordTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: theme.palette.themePrimary,
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: `2px solid ${theme.palette.themePrimary}`,
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    display: 'inline-block',
    marginLeft: '12px',
  },
  statusInStock: {
    backgroundColor: theme.palette.greenLight,
    color: theme.palette.green,
  },
  statusOutOfStock: {
    backgroundColor: theme.palette.neutralLight,
    color: theme.palette.neutralSecondary,
  },
  statusNoData: {
    backgroundColor: theme.palette.yellowLight,
    color: theme.palette.neutralPrimary,
  },
  noData: {
    textAlign: 'center',
    padding: '20px',
    color: theme.palette.neutralSecondary,
    fontStyle: 'italic',
  },
});

const formatNumber = (value: string | number | undefined): string => {
  if (!value || value === 'N/A' || value === '') return '0';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(numValue) ? '0' : numValue.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const getStockStatus = (stock: string | undefined): 'in-stock' | 'out-of-stock' | 'no-data' => {
  if (!stock || stock === '' || stock === 'N/A') return 'no-data';
  try {
    const stockValue = parseFloat(stock);
    return stockValue > 0 ? 'in-stock' : 'out-of-stock';
  } catch {
    return 'no-data';
  }
};

const formatSpecificationName = (key: string): string => {
  // Convert snake_case and camelCase to readable format
  let formatted = key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
  
  return formatted;
};

const InventoryStatusLayout: React.FC<{ item: InventoryStatusProps }> = (props) => {
  const { material, plant_number, plant_data, total_plants_checked, plant_name } = props.item;

  // Check if we have data
  if (!plant_data) {
    return (
      <Stack className={styles.root}>
        <div className={styles.card}>
          <Text className={styles.noData}>No plant inventory information available</Text>
        </div>
      </Stack>
    );
  }

  const stockStatus = getStockStatus(plant_data.AmountInStock);

  // Determine status text and badge style
  let statusText = 'Not Available';
  let statusBadgeClass = styles.statusNoData;
  
  if (stockStatus === 'in-stock') {
    statusText = '✓ In Stock';
    statusBadgeClass = styles.statusInStock;
  } else if (stockStatus === 'out-of-stock') {
    statusText = 'Out of Stock';
    statusBadgeClass = styles.statusOutOfStock;
  }

  // Define columns for DetailsList
  const detailColumns: IColumn[] = [
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

  // Build items array for DetailsList
  const detailItems = [
    {
      key: 'material',
      specification: 'Material/SKU',
      value: plant_data.ItemNumber || material,
    },
    {
      key: 'description',
      specification: 'Description',
      value: plant_data.ItemDescription || 'N/A',
    },
    {
      key: 'itemType',
      specification: 'Item Type',
      value: plant_data.ItemType || 'N/A',
    },
    {
      key: 'stock',
      specification: 'Amount In Stock',
      value: `${formatNumber(plant_data.AmountInStock)} units`,
    },
    {
      key: 'status',
      specification: 'Stock Status',
      value: statusText,
    },
    {
      key: 'plantNumber',
      specification: 'Plant Number',
      value: plant_data.Plant || plant_number,
    },
    {
      key: 'plantName',
      specification: 'Plant Name',
      value: plant_name || 'N/A',
    },
    {
      key: 'division',
      specification: 'Division',
      value: plant_data.Division 
        ? `${plant_data.Division}${plant_data.DivisionDesc ? ` - ${plant_data.DivisionDesc}` : ''}`
        : 'N/A',
    },
    {
      key: 'allocation',
      specification: 'Product Allocation',
      value: plant_data.ProdAllocation || 'N/A',
    },
    {
      key: 'itemStatus',
      specification: 'Item Status',
      value: plant_data.ItemStatus
        ? `${plant_data.ItemStatus}${plant_data.StatusDescription ? ` - ${plant_data.StatusDescription}` : ''}`
        : 'N/A',
    },
  ];

  // Add total plants checked if available
  if (total_plants_checked) {
    detailItems.push({
      key: 'totalPlants',
      specification: 'Total Plants Checked',
      value: `${total_plants_checked} plants`,
    });
  }

  // Build record title with plant name if available
  const plantName = plant_name || '';
  const recordTitle = plantName 
    ? `Plant #${plant_number} (${plantName}) - ${material}`
    : `Plant #${plant_number} - ${material}`;

  return (
    <Stack className={styles.root}>
      <div className={styles.card}>
        <div className={styles.recordContainer}>
          <Text className={styles.recordTitle}>
            {recordTitle}
            <span className={`${styles.statusBadge} ${statusBadgeClass}`}>
              {statusText}
            </span>
          </Text>
          <div className={styles.detailsListContainer}>
            <DetailsList
              items={detailItems}
              columns={detailColumns}
              selectionMode={SelectionMode.none}
              isHeaderVisible={true}
              compact={true}
            />
          </div>
        </div>
      </div>
    </Stack>
  );
};

export default InventoryStatusLayout;
