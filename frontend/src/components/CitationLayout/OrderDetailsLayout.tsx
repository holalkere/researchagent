import React from 'react';
import {
  Stack,
  Text,
  Pivot,
  PivotItem,
  DetailsList,
  IColumn,
  SelectionMode,
  mergeStyleSets,
  getTheme,
  Separator,
} from '@fluentui/react';



interface OrderHeader {
  SalesOrderNumber?: string;
  OrderStatus?: string;
  RcvDate?: string;
  DocumentDate?: string;
  RequestedDeliveryDate?: string;
  SoldToName?: string;
  SoldTo?: string;
  ShipToName?: string;
  ShipTo?: string;
  PurchaseNumber?: string;
  SalesOrg?: string;
  DistributionChannel?: string;
  Division?: string;
  CreatedBy?: string;
  DocumentType?: string;
  ShippingCondition?: string;
  CustGrp4?: string;
  CustGrp5?: string;
}

interface OrderItem {
  ItemNumber?: string;
  Material?: string;
  ItemShortText?: string;
  RequestedQuantity?: string;
  BaseUOM?: string;
  Plant?: string;
  ShippingPlant?: string;
  LineItemStatus?: string;
  Delivery?: string;
  TrackingNum?: string;
  DeliveryQty?: string;
  ConfirmQty?: string;
  OpenQty?: string;
  RejectedQty?: string;
  AnticipShipDate?: string[];
  ShipAddress?: string;
  ReasonRejected?: string;
  MaterialGroup?: string;
  ItemCategory?: string;
  ProcessingStatus?: string;
  CreditStatus?: string;
}

interface OrderSchedule {
  ScheduleLineNumber?: string;
  ScheduleLineDate?: string;
  ScheduleLineQty?: string;
  AnticipShipDate?: string;
}

interface OrderAddress {
  Name?: string;
  Street?: string;
  City?: string;
  State?: string;
  PostalCode?: string;
  Telephone?: string;
  FaxNumber?: string;
}

interface OrderText {
  Line?: string;
}

interface OrderBusiness {
  PurchaseNumber_C?: string;
}

interface OrderData {
  Headers?: {
    Header?: OrderHeader;
  };
  Items?: {
    Item?: OrderItem;
  };
  Schedules?: {
    Schedule?: OrderSchedule[];
  };
  Addresses?: {
    Address?: OrderAddress[];
  };
  OrderText?: {
    Text?: OrderText;
  };
  OrderBusiness?: {
    Business?: OrderBusiness;
  };
}

interface OrderDetailsProps {
  order_number: string;
  order_data: OrderData;
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
  statusCard: {
    marginBottom: '8px',
    padding: '8px',
    backgroundColor: theme.palette.neutralLighter,
    border: `1px solid ${theme.palette.neutralLight}`,
    borderRadius: '4px',
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
  orderNumber: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: theme.palette.themePrimary,
  },
  orderStatus: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    display: 'inline-block',
    marginBottom: '8px',
  },
  statusActive: {
    backgroundColor: theme.palette.greenLight,
    color: theme.palette.green,
  },
  statusPending: {
    backgroundColor: theme.palette.orange,
    color: theme.palette.white,
  },
  statusDefault: {
    backgroundColor: theme.palette.neutralLight,
    color: theme.palette.neutralSecondary,
  },
  priceValue: {
    color: theme.palette.themePrimary,
    fontWeight: 'bold',
  },
  noData: {
    textAlign: 'center',
    padding: '20px',
    color: theme.palette.neutralSecondary,
    fontStyle: 'italic',
  },
});

const formatDate = (dateString: string): string => {
  if (!dateString || dateString.length !== 8) return dateString || 'N/A';
  return `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}`;
};

const formatNumber = (value: string | number | undefined): string => {
  if (!value || value === 'N/A' || value === '') return '0.00';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
};

const getOrderStatusStyle = (status: string) => {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('complete') || lowerStatus.includes('delivered') || lowerStatus.includes('shipped')) {
    return styles.statusActive;
  } else if (lowerStatus.includes('pending') || lowerStatus.includes('processing') || lowerStatus.includes('open')) {
    return styles.statusPending;
  } else {
    return styles.statusDefault;
  }
};

// Reason reject mapping
const reasonRejectMapping: { [key: string]: string } = {
  '00': '00 Assigned by Trading Contract',
  '01': '01 Delivery Too Late',
  '02': '02 Customer Request',
  '03': '03 Ship or Cancel Request',
  '04': '04 Past Cancel Date',
  '05': '05 Discontinued, No Longer Available',
  '06': '06 Discontinued with Replacement',
  '07': '07 Customer Service Adjustment',
  '08': '08 Refused - return sent back to cust',
  '09': '09 Product not received in return shipmt',
  '10': '10 Invalid Claim',
  '11': '11 Item not returned',
  '12': '12 Disc, order through product service',
  '13': '13 Cancelled per sales rep',
  '14': '14 Moved to product service system',
  '15': '15 Discontinued, No Substitution Allowed',
  '16': '16 Ship or Cancel - Inventory Issue',
  '17': '17 Deleted and Moved to New Order',
  '18': '18 Suspended, No Inventory Available',
  '19': '19 Cancelled - Pricing issue unresolved.',
  '20': '20 Cancelled  - Recon cancel policy.',
  '21': '21 RBOM Incorrect Qty',
  '22': '22 Customer Error',
  '23': '23 Product Not Available',
  '24': '24 Inventory not available Walmart DSDC',
  '25': '25 Cust agreed to cx, no invy',
  '26': '26 Coil Differential Allowance',
  '27': '27 Auto Rejected - Old Line',
  '28': '28 Auto Reject, Pricing',
  '41': '41 Out of Policy Date Code',
  '42': '42 Missing Tool',
  '43': '43 Missing Battery',
  '44': '44 Missing Charger',
  '45': '45 Missing Parts',
  '46': '46 Swapped parts',
  '47': '47 Abuse',
  'CA': 'CA Cancelled,  Add New Line for Sub',
  'CC': 'CC Canceled for system conversion',
  'CD': 'CD Cancelled due to single delivery',
  'CI': 'CI Cancelled due to single invoicing',
  'CR': 'CR Credit Reasons',
  'CU': 'CU Credit Memo Clean-up',
  'DS': 'DS Deallocate Stock',
  'ES': 'Should have been an Estimate',
  'OC': 'OC Forecast overconsumption',
  'RR': 'RR Returned Not Repaired',
  'SR': 'SR SRD Plnd Ord',
  'TL': 'TL Exceeds TL Constraints - Cust Svc Adj',
  'UA': 'UL Statistical Use - Ultimus Approval',
  'Z1': 'Z1 Coil Differential Allowance',
  'Z2': 'Z2 Cancelled Due to Unshipped in 7 days'
};

const getReasonRejectText = (code: string): string => {
  return reasonRejectMapping[code] || code;
};

const OrderDetailsLayout: React.FC<{item: OrderDetailsProps}> = (props) => {
  const { order_number, order_data } = props.item;

  // Extract data sections
  const headers = order_data?.Headers?.Header || {};
  const items = order_data?.Items?.Item || {};
  const schedules = order_data?.Schedules?.Schedule || [];
  const addresses = order_data?.Addresses?.Address || [];
  const orderText = order_data?.OrderText?.Text || {};
  const business = order_data?.OrderBusiness?.Business || {};

  // Check if we have any meaningful data
  const hasData = Object.keys(headers).length > 0 || Object.keys(items).length > 0;

  if (!hasData) {
    return (
      <Stack className={styles.root}>
        <div className={styles.card}>
          <Text className={styles.noData}>No order information available</Text>
        </div>
      </Stack>
    );
  }

  // Schedule columns for DetailsList
  const scheduleColumns: IColumn[] = [
    {
      key: 'lineNumber',
      name: 'Line #',
      fieldName: 'lineNumber',
      minWidth: 60,
      maxWidth: 80,
    },
    {
      key: 'date',
      name: 'Date',
      fieldName: 'date',
      minWidth: 100,
      maxWidth: 120,
    },
    {
      key: 'quantity',
      name: 'Quantity',
      fieldName: 'quantity',
      minWidth: 80,
      maxWidth: 100,
    },
    {
      key: 'shipDate',
      name: 'Ship Date',
      fieldName: 'shipDate',
      minWidth: 100,
      maxWidth: 120,
    },
  ];

  const scheduleItems = schedules.map((schedule, index) => ({
    key: index.toString(),
    lineNumber: schedule.ScheduleLineNumber || 'N/A',
    date: formatDate(schedule.ScheduleLineDate || ''),
    quantity: formatNumber(schedule.ScheduleLineQty),
    shipDate: formatDate(schedule.AnticipShipDate || ''),
  }));

  const renderOrderSummary = () => (
    <Stack tokens={{ childrenGap: 8 }}>
      {/* Order Number and Status */}
      <Text className={styles.orderNumber}>
        Order #{headers.SalesOrderNumber || order_number}
      </Text>
      
      {headers.OrderStatus && (
        <Text className={`${styles.orderStatus} ${getOrderStatusStyle(headers.OrderStatus)}`}>
          {headers.OrderStatus}
        </Text>
      )}

      {/* Basic Order Information */}
      <div className={styles.statusCard}>
        <Text className={styles.statusHeader}>Order Information</Text>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Order Date:</span>
          <span className={styles.statusValue}>{formatDate(headers.RcvDate || '')}</span>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Document Date:</span>
          <span className={styles.statusValue}>{formatDate(headers.DocumentDate || '')}</span>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Requested Delivery:</span>
          <span className={styles.statusValue}>{formatDate(headers.RequestedDeliveryDate || '')}</span>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Purchase Order #:</span>
          <span className={styles.statusValue}>{headers.PurchaseNumber || 'N/A'}</span>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Order Type:</span>
          <span className={styles.statusValue}>{headers.DocumentType || 'N/A'}</span>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Sales Organization:</span>
          <span className={styles.statusValue}>{headers.SalesOrg || 'N/A'}</span>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Distribution Channel:</span>
          <span className={styles.statusValue}>{headers.DistributionChannel || 'N/A'}</span>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Division:</span>
          <span className={styles.statusValue}>{headers.Division || 'N/A'}</span>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Created By:</span>
          <span className={styles.statusValue}>{headers.CreatedBy || 'N/A'}</span>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Shipping Condition:</span>
          <span className={styles.statusValue}>{headers.ShippingCondition || 'N/A'}</span>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Customer Group 4:</span>
          <span className={styles.statusValue}>{headers.CustGrp4 || 'N/A'}</span>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Customer Group 5:</span>
          <span className={styles.statusValue}>{headers.CustGrp5 || 'N/A'}</span>
        </div>
      </div>

      {/* Customer Information */}
      <div className={styles.statusCard}>
        <Text className={styles.statusHeader}>Customer Information</Text>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Sold To:</span>
          <span className={styles.statusValue}>
            {headers.SoldToName || 'N/A'} ({headers.SoldTo || 'N/A'})
          </span>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Ship To:</span>
          <span className={styles.statusValue}>
            {headers.ShipToName || 'N/A'} ({headers.ShipTo || 'N/A'})
          </span>
        </div>
      </div>

      {/* Business Information */}
      {Object.keys(business).length > 0 && (
        <div className={styles.statusCard}>
          <Text className={styles.statusHeader}>Business Information</Text>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Purchase Number (C):</span>
            <span className={styles.statusValue}>{business.PurchaseNumber_C || 'N/A'}</span>
          </div>
        </div>
      )}
    </Stack>
  );

  const renderItemDetails = () => (
    <Stack tokens={{ childrenGap: 8 }}>
      {Object.keys(items).length > 0 ? (
        <>
          <div className={styles.statusCard}>
            <Text className={styles.statusHeader}>Product Information</Text>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Item Number:</span>
              <span className={styles.statusValue}>{items.ItemNumber || 'N/A'}</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Material:</span>
              <span className={styles.statusValue}>{items.Material || 'N/A'}</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Description:</span>
              <span className={styles.statusValue}>{items.ItemShortText || 'N/A'}</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Plant:</span>
              <span className={styles.statusValue}>{items.Plant || 'N/A'}</span>
            </div>
          </div>

          <div className={styles.statusCard}>
            <Text className={styles.statusHeader}>Quantity Information</Text>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Ordered Quantity:</span>
              <span className={styles.statusValue}>
                {formatNumber(items.RequestedQuantity)} {items.BaseUOM || 'EA'}
              </span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Confirmed Quantity:</span>
              <span className={styles.statusValue}>
                {formatNumber(items.ConfirmQty)} {items.BaseUOM || 'EA'}
              </span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Delivered Quantity:</span>
              <span className={styles.statusValue}>
                {formatNumber(items.DeliveryQty)} {items.BaseUOM || 'EA'}
              </span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Open Quantity:</span>
              <span className={styles.statusValue}>
                {formatNumber(items.OpenQty)} {items.BaseUOM || 'EA'}
              </span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Rejected Quantity:</span>
              <span className={styles.statusValue}>
                {formatNumber(items.RejectedQty)} {items.BaseUOM || 'EA'}
              </span>
            </div>
          </div>

          <div className={styles.statusCard}>
            <Text className={styles.statusHeader}>Product Details</Text>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Shipping Plant:</span>
              <span className={styles.statusValue}>{items.ShippingPlant || 'N/A'}</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Material Group:</span>
              <span className={styles.statusValue}>{items.MaterialGroup || 'N/A'}</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Item Category:</span>
              <span className={styles.statusValue}>{items.ItemCategory || 'N/A'}</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Processing Status:</span>
              <span className={styles.statusValue}>{items.ProcessingStatus || 'N/A'}</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Credit Status:</span>
              <span className={styles.statusValue}>{items.CreditStatus || 'N/A'}</span>
            </div>
          </div>

          <div className={styles.statusCard}>
            <Text className={styles.statusHeader}>Delivery Information</Text>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Item Status:</span>
              <span className={styles.statusValue}>{items.LineItemStatus || 'N/A'}</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Delivery Number:</span>
              <span className={styles.statusValue}>{items.Delivery || 'N/A'}</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Tracking Number:</span>
              <span className={styles.statusValue}>{items.TrackingNum || 'N/A'}</span>
            </div>
            {items.AnticipShipDate && items.AnticipShipDate.length > 0 && (
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>Anticipated Ship Date:</span>
                <span className={styles.statusValue}>
                  {formatDate(items.AnticipShipDate[0])}
                </span>
              </div>
            )}
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Ship Address:</span>
              <span className={styles.statusValue}>{items.ShipAddress || 'N/A'}</span>
            </div>
            {items.ReasonRejected && items.ReasonRejected != "" && (
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>Reason for Rejection:</span>
                <span className={styles.statusValue}>{getReasonRejectText(items.ReasonRejected)}</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <Text className={styles.noData}>No item details available</Text>
      )}
    </Stack>
  );

  const renderSchedules = () => (
    <Stack tokens={{ childrenGap: 8 }}>
      {schedules.length > 0 ? (
        <DetailsList
          items={scheduleItems}
          columns={scheduleColumns}
          selectionMode={SelectionMode.none}
          isHeaderVisible={true}
          compact={true}
        />
      ) : (
        <Text className={styles.noData}>No schedule information available</Text>
      )}
    </Stack>
  );

  const renderAddresses = () => (
    <Stack tokens={{ childrenGap: 8 }}>
      {addresses.length > 0 ? (
        addresses.map((address, index) => (
          <div key={index} className={styles.statusCard}>
            <Text className={styles.statusHeader}>
              {address.Name || `Address ${index + 1}`}
            </Text>
            {address.Street && (
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>Street:</span>
                <span className={styles.statusValue}>{address.Street}</span>
              </div>
            )}
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>City, State ZIP:</span>
              <span className={styles.statusValue}>
                {address.City || 'N/A'}, {address.State || 'N/A'} {address.PostalCode || ''}
              </span>
            </div>
            {address.Telephone && (
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>Phone:</span>
                <span className={styles.statusValue}>{address.Telephone}</span>
              </div>
            )}
            {address.FaxNumber && (
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>Fax:</span>
                <span className={styles.statusValue}>{address.FaxNumber}</span>
              </div>
            )}
          </div>
        ))
      ) : (
        <Text className={styles.noData}>No address information available</Text>
      )}
    </Stack>
  );

  const renderOrderNotes = () => (
    <Stack tokens={{ childrenGap: 8 }}>
      {orderText && orderText.Line ? (
        <div className={styles.statusCard}>
          <Text className={styles.statusHeader}>Order Notes</Text>
          <div className={styles.statusRow}>
            <span className={styles.statusValue}>{orderText.Line}</span>
          </div>
        </div>
      ) : (
        <Text className={styles.noData}>No order notes available</Text>
      )}
    </Stack>
  );



  return (
    <Stack className={styles.root}>
      <div className={styles.card}>
        <Pivot>
          <PivotItem headerText="Order Summary">
            {renderOrderSummary()}
          </PivotItem>
          <PivotItem headerText="Item Details">
            {renderItemDetails()}
          </PivotItem>
          <PivotItem headerText="Schedule">
            {renderSchedules()}
          </PivotItem>
          <PivotItem headerText="Addresses">
            {renderAddresses()}
          </PivotItem>
          <PivotItem headerText="Notes">
            {renderOrderNotes()}
          </PivotItem>
        </Pivot>
      </div>
    </Stack>
  );
};

export default OrderDetailsLayout; 