import React from 'react';
import {
  Stack,
  Text,
  Pivot,
  PivotItem,
  Image,
  DetailsList,
  IColumn,
  SelectionMode,
  mergeStyleSets,
  getTheme
} from '@fluentui/react';

interface ProductImage {
  URL: string;
  Name: string;
}

interface ProductSpecification {
  [key: string]: string;
}

interface ProductStatus {
  product_NOD: ProductStatusItem[];
}

interface ProductStatusItem {
  [key: string]: string;
}

interface CountryOfOrigin {
  code: string;
  name: string;
}

interface HarmonizedTab {
  title: string;
  content: string;
  data: { [key: string]: any };
}

interface HarmonizedTabs {
  general_info: HarmonizedTab;
  specifications: HarmonizedTab;
  nod_status: HarmonizedTab;
}

interface ProductInfoProps {
  product_images: ProductImage[];
  product_category_full: string;
  product_category_lowest: string;
  product_category_normalized: string;
  product_name: string;
  product_brand: string;
  product_sku: string;
  product_price: string;
  product_features: string;
  product_description: string;
  product_specifications: ProductSpecification;
  product_configuration: string;
  enhanced_product_name: string;
  product_sales_status: string;
  product_status: ProductStatus;
  country_of_origin: CountryOfOrigin[];
  product_base_sku: string;
  warranty: string;
  product_id: string;
  country_sold: string[];
  retail_name: string;
  harmonized_tabs?: HarmonizedTabs;
}

const theme = getTheme();
const styles = mergeStyleSets({
  root: {
    maxWidth: '100%',
    padding: '12px',
  },
  imageContainer: {
    width: '100%',
    height: '200px',
    objectFit: 'contain',
    marginBottom: '12px',
    justifyContent: 'center',
    display: 'flex',
  },
  card: {
    marginBottom: '12px',
    padding: '12px',
    backgroundColor: theme.palette.white,
    boxShadow: theme.effects.elevation4,
    borderRadius: '8px',
  },
  price: {
    color: theme.palette.themePrimary,
    fontWeight: 'bold',
  },
  statusCard: {
    marginBottom: '8px',
    padding: '8px',
    backgroundColor: theme.palette.neutralLighter,
    border: `1px solid ${theme.palette.neutralLight}`,
  },
  statusHeader: {
    fontWeight: 'bold',
    marginBottom: '4px',
    color: theme.palette.themePrimary,
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '2px',
    fontSize: '12px',
  },
  statusLabel: {
    fontWeight: '500',
    color: theme.palette.neutralPrimary,
  },
  statusValue: {
    color: theme.palette.neutralSecondary,
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
  infoValue: {
    color: theme.palette.neutralPrimary,
    textAlign: 'left',
    marginTop: '8px',
    lineHeight: '1.6',
    fontSize: '14px',
  },
  infoSection: {
    padding: '16px',
    backgroundColor: theme.palette.neutralLighterAlt,
    borderRadius: '12px',
    border: `1px solid ${theme.palette.neutralLight}`,
    transition: 'all 0.2s ease-in-out',
    ':hover': {
      boxShadow: theme.effects.elevation8,
      transform: 'translateY(-2px)',
    },
  },
  infoLabel: {
    fontWeight: '600',
    color: theme.palette.themePrimary,
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  productName: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: theme.palette.neutralPrimary,
  },
  productPrice: {
    fontSize: '18px',
    color: theme.palette.themePrimary,
    fontWeight: 'bold',
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: theme.palette.themeLighterAlt,
    borderRadius: '8px',
    display: 'inline-block',
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
  nodRecordContainer: {
    backgroundColor: theme.palette.neutralLighterAlt,
    border: `1px solid ${theme.palette.neutralLight}`,
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  nodRecordTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: theme.palette.themePrimary,
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: `2px solid ${theme.palette.themePrimary}`,
  },
});

const ProductInfoLayout: React.FC<{item:ProductInfoProps, citationUrl?: string}> = (props) => {
  const specificationColumns: IColumn[] = [
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

  const specificationItems = Object.entries(props.item.product_specifications).map(([key, value]) => ({
    key,
    specification: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    value,
  }));

  // Helper functions for formatting
  const formatSpecificationName = (key: string): string => {
    // Convert snake_case and camelCase to readable format
    let formatted = key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    
    // Fix NOD spacing - replace "N O D" with "NOD"
    formatted = formatted.replace(/\bN\s+O\s+D\b/g, 'NOD');
    
    // Fix other common acronyms that might have spacing issues
    formatted = formatted.replace(/\bS\s+R\s+S\b/g, 'SRS');
    formatted = formatted.replace(/\bS\s+K\s+U\b/g, 'SKU');
    formatted = formatted.replace(/\bC\s+M\b/g, 'CM');
    
    return formatted;
  };

  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(item => formatValue(key, item)).join(', ');
    }

    // Handle objects (including JSON)
    if (typeof value === 'object') {
      // Special handling for country objects
      if (key.toLowerCase().includes('country') && value.name) {
        return value.name;
      }
      if (key.toLowerCase().includes('country') && value.code) {
        return value.code;
      }
      
      // For other objects, try to extract meaningful values
      if (value.name) return value.name;
      if (value.code) return value.code;
      if (value.value) return value.value;
      if (value.title) return value.title;
      
      // If it's a complex object, stringify it
      return JSON.stringify(value);
    }

    const stringValue = String(value);
    
    // Special formatting for NOD status values
    if (key.toLowerCase().includes('nod') || key.toLowerCase().includes('status')) {
      // Capitalize first letter of each word for status values
      return stringValue
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    // Special formatting for country data (if it's a JSON string)
    if (key.toLowerCase().includes('country') && stringValue.includes('{') && stringValue.includes('}')) {
      try {
        const parsed = JSON.parse(stringValue);
        if (Array.isArray(parsed)) {
          return parsed.map(item => item.name || item.code || item).join(', ');
        } else if (parsed.name) {
          return parsed.name;
        } else if (parsed.code) {
          return parsed.code;
        }
      } catch (e) {
        // If parsing fails, return as is
      }
    }
    
    return stringValue;
  };

  // Function to render General Info content in harmonized format
  const renderGeneralInfoContent = () => {
    const generalInfoData = {
      "product_brand": props.item.product_brand,
      "product_sku": props.item.product_sku,
      "product_base_sku": props.item.product_base_sku,
      "enhanced_product_name": props.item.enhanced_product_name,
      "product_category_lowest": props.item.product_category_lowest,
      "product_category_normalized": props.item.product_category_normalized,
      "product_category_full": props.item.product_category_full,
      "product_configuration": props.item.product_configuration,
      "product_description": props.item.product_description,
      "product_features": props.item.product_features,
      "product_price": props.item.product_price,
      "product_sales_status": props.item.product_sales_status,
      "retail_name": props.item.retail_name,      
      "warranty": props.item.warranty,
      "country_of_origin": props.item.country_of_origin,
      "country_sold": props.item.country_sold
    };

    const tabData = {
      title: "General Info",
      content: "",
      data: generalInfoData
    };

    return renderHarmonizedTabContent(tabData);
  };

  // Function to render Specifications content in harmonized format
  const renderSpecificationsContent = () => {
    const specificationsData = props.item.product_specifications || {};

    const tabData = {
      title: "Specifications",
      content: "",
      data: specificationsData
    };

    return renderHarmonizedTabContent(tabData);
  };

  // Function to render Status content
  const renderStatusContent = () => {
    const statusData = props.item.product_status || {};
    return renderNODStatusContent(statusData);
  };

  // Special function to render NOD status content
  const renderNODStatusContent = (data: any) => {
    const nodRecords: Array<{title: string, items: Array<{key: string, specification: string, value: string}>}> = [];
    
    // Look for product_NOD array in the data
    if (data.product_NOD && Array.isArray(data.product_NOD)) {
      data.product_NOD.forEach((nodObject: any, index: number) => {
        if (typeof nodObject === 'object' && nodObject !== null) {
          const items: Array<{key: string, specification: string, value: string}> = [];
          
          // Add all key-value pairs from this NOD object
          Object.entries(nodObject).forEach(([key, value]) => {
            if (value !== null && value !== undefined && String(value).trim() !== '') {
              items.push({
                key: `${index}_${key}`,
                specification: formatSpecificationName(key),
                value: formatValue(key, value)
              });
            }
          });
          
          if (items.length > 0) {
            // Use Region field as title if available, otherwise fallback to NOD Status
            const regionValue = nodObject.Region || nodObject.region;
            const title = regionValue ? `${regionValue} NOD Status` : `NOD Status ${index + 1}`;
            
            nodRecords.push({
              title: title,
              items: items
            });
          }
        }
      });
    } else {
      // Fallback: treat the entire data object as NOD data
      const items: Array<{key: string, specification: string, value: string}> = [];
      Object.entries(data).forEach(([key, value]) => {
        // Skip the product_NOD key itself
        if (key === 'product_NOD') return;
        
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          items.push({
            key,
            specification: formatSpecificationName(key),
            value: formatValue(key, value)
          });
        }
      });
      
      if (items.length > 0) {
        nodRecords.push({
          title: 'NOD Status',
          items: items
        });
      }
    }

    if (nodRecords.length === 0) {
      return <Text>No NOD status data available</Text>;
    }

    // Sort records to show US first, then others
    const sortedRecords = nodRecords.sort((a, b) => {
      if (a.title.startsWith('US')) return -1;
      if (b.title.startsWith('US')) return 1;
      return 0;
    });

    return (
      <Stack tokens={{ childrenGap: 16 }}>
        {sortedRecords.map((record, recordIndex) => (
          <div key={recordIndex} className={styles.nodRecordContainer}>
            <Text className={styles.nodRecordTitle}>{record.title}</Text>
            <div className={styles.detailsListContainer}>
              <DetailsList
                items={record.items}
                columns={specificationColumns}
                selectionMode={SelectionMode.none}
                isHeaderVisible={true}
                compact={true}
              />
            </div>
          </div>
        ))}
      </Stack>
    );
  };

  // Function to render harmonized tab content
  const renderHarmonizedTabContent = (tabData: HarmonizedTab) => {
    if (!tabData || !tabData.data) {
      return <Text>No data available</Text>;
    }

    // Special handling for NOD status data
    if (tabData.title === "NOD Status" || tabData.title === "Status") {
      return renderNODStatusContent(tabData.data);
    }

    // Add defensive programming to handle any data type
    const items = Object.entries(tabData.data)
      .filter(([key, value]) => {
        try {
          if (value === null || value === undefined) return false;
          
          // Handle arrays - check if they have any non-empty items
          if (Array.isArray(value)) {
            return value.length > 0 && value.some(item => item !== null && item !== undefined && String(item).trim() !== '');
          }
          
          // Handle objects - check if they have any meaningful content
          if (typeof value === 'object') {
            return Object.keys(value).length > 0;
          }
          
          // Handle primitive values
          const stringValue = String(value);
          return stringValue && stringValue.trim() !== '';
        } catch (error) {
          console.warn('Error processing value:', value, error);
          return false;
        }
      })
      .map(([key, value]) => ({
        key,
        specification: formatSpecificationName(key),
        value: formatValue(key, value),
      }));

    if (items.length === 0) {
      return <Text>No data available</Text>;
    }

    return (
      <div className={styles.detailsListContainer}>
        <DetailsList
          items={items}
          columns={specificationColumns}
          selectionMode={SelectionMode.none}
          isHeaderVisible={true}
          compact={true}
        />
      </div>
    );
  };


  return (
    <Stack className={styles.root}>

      {/* Product Details */}
      <div className={styles.card} style={{textAlign:'justify'}}>
        {/* Product Image */}
        {props.item.product_images && props.item.product_images.length > 0 && (
          <div style={{width:'100%',marginBottom:'12px',textAlign:'center'}}>
            <Image
              src={props.item.product_images[0].URL}
              alt={props.item.product_images[0].Name}
              className={styles.imageContainer}
            />
          </div>
        )}

        {/* Product Name */}
        {props.item.enhanced_product_name && (
          <Text className={styles.productName}>
            {props.item.enhanced_product_name}
          </Text>
        )}

        {/* Product Information */}
        {(
          <>
            {(props.item.product_sku || props.item.product_brand) && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', marginTop: '12px' }}>
                {props.item.product_sku && (
                  <div style={{
                    backgroundColor: '#ffd20a',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {props.item.product_sku}
                  </div>
                )}
                {props.item.product_brand && (
                  <div style={{
                    backgroundColor: '#ffd20a',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {props.item.product_brand}
                  </div>
                )}
              </div>
            )}
            {props.item.product_description && (
              <Text style={{ textAlign: 'justify', marginBottom: '12px' }}>
                {props.item.product_description}
              </Text>
            )}
          </>
        )}

        {/* Product URL */}
        {props.citationUrl && (
          <div style={{ marginTop: '12px', marginBottom: '12px' }}>
            <a 
              href={props.citationUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 16px',
                backgroundColor: '#ffd20a',
                color: '#000000',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e6bc00';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = theme.effects.elevation8;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffd20a';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              View Product Details
            </a>
          </div>
        )}

        {/* Product Description */}
        
      </div>

      {/* Tabs Section */}
      <div className={styles.card}>
        <Pivot>
          <PivotItem headerText="General Info">
            {renderGeneralInfoContent()}
          </PivotItem>
          <PivotItem headerText="Specifications">
            {renderSpecificationsContent()}
          </PivotItem>
          <PivotItem headerText="Status">
            {renderStatusContent()}
          </PivotItem>
        </Pivot>
      </div>
    </Stack>
  );
};

export default ProductInfoLayout;

