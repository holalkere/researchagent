import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  Stack,
  TextField,
  PrimaryButton,
  DefaultButton,
  Dialog,
  DialogType,
  DialogFooter,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
  DetailsList,
  IColumn,
  SelectionMode,
  CommandBar,
  ICommandBarItemProps,
  Toggle,
  ComboBox,
  Dropdown,
  IDropdownOption,
  SearchBox,
  Text,
  IconButton,
  TooltipHost,
  TooltipOverflowMode,
  TagPicker,
  ITag,
  Persona,
  PersonaSize,
  PersonaPresence,
  ActionButton,
  IContextualMenuProps,
  ContextualMenu,
} from "@fluentui/react";
import { useBoolean } from "@fluentui/react-hooks";
import {
  AddRegular,
  EditRegular,
  DeleteRegular,
  SearchRegular,
  FilterRegular,
  ShieldRegular,
  CalendarRegular,
  PersonRegular,
  SettingsRegular,
  ShieldProhibitedRegular,
} from "@fluentui/react-icons";
import { AppStateContext } from "../../state/AppProvider";
import styles from "./Admin.module.css";

interface UserAccess {
  id?: string;
  user_name: string;
  user_permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

interface UserAccessResponse {
  items: UserAccess[];
  total_count: number;
  has_more: boolean;
  page?: number;
  page_size?: number;
  total_pages?: number;
}

const Admin = () => {
  const appStateContext = useContext(AppStateContext);
  const userDetails = appStateContext?.state.frontendSettings?.user_details;
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState<boolean>(false);
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<UserAccess | null>(null);
  
  // Form states
  const [userName, setUserName] = useState<string>("");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean>(true);
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("user_name");
  const [sortOrder, setSortOrder] = useState<string>("ASC");

  // Context menu
  const [showContextMenu, { toggle: toggleContextMenu }] = useBoolean(false);
  const [contextMenuTarget, setContextMenuTarget] = useState<HTMLElement | null>(null);
  const [contextMenuUser, setContextMenuUser] = useState<UserAccess | null>(null);

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, [currentPage, pageSize, searchText, activeFilter, sortBy, sortOrder]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      
      if (searchText) {
        params.append("user_name_filter", searchText);
      }
      
      if (activeFilter !== "all") {
        params.append("is_active", activeFilter === "active" ? "true" : "false");
      }
      
      const response = await fetch(`/user_access/page?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: UserAccessResponse = await response.json();
      setUsers(data.items || []);
      setTotalCount(data.total_count || 0);
      setTotalPages(data.total_pages || 0);
    } catch (err) {
      setError(`Failed to load users: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchText, activeFilter, sortBy, sortOrder]);

  const handleAddUser = async () => {
    if (!userName.trim() || userPermissions.length === 0) {
      setError("User name and permissions are required");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      
      const response = await fetch("/user_access/upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_name: userName.trim(),
          user_permissions: userPermissions,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      setSuccess("User added successfully");
      setShowAddDialog(false);
      resetForm();
      loadUsers();
    } catch (err) {
      setError(`Failed to add user: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser || !userName.trim() || userPermissions.length === 0) {
      setError("User name and permissions are required");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      
      const response = await fetch("/user_access/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedUser.id,
          user_name: userName.trim(),
          user_permissions: userPermissions,
          is_active: isActive,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      setSuccess("User updated successfully");
      setShowEditDialog(false);
      resetForm();
      loadUsers();
    } catch (err) {
      setError(`Failed to update user: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/user_access/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_name: selectedUser.user_name,
          id: selectedUser.id,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      setSuccess("User deleted successfully");
      setShowDeleteDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      setError(`Failed to delete user: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUserName("");
    setUserPermissions([]);
    setIsActive(true);
    setSelectedUser(null);
  };

  const openEditDialog = (user: UserAccess) => {
    setSelectedUser(user);
    setUserName(user.user_name);
    // Set the user permissions as an array
    setUserPermissions(user.user_permissions);
    setIsActive(user.is_active);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (user: UserAccess) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const handleContextMenu = (user: UserAccess, event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setContextMenuUser(user);
    setContextMenuTarget(event.currentTarget);
    toggleContextMenu();
  };

  const getContextMenuProps = (): IContextualMenuProps => ({
    items: [
      {
        key: 'edit',
        text: 'Edit User',
        iconProps: { iconName: 'Edit' },
        onClick: () => {
          if (contextMenuUser) {
            openEditDialog(contextMenuUser);
            toggleContextMenu();
          }
          return false;
        },
      },
      {
        key: 'delete',
        text: 'Delete User',
        iconProps: { iconName: 'Delete' },
        onClick: () => {
          if (contextMenuUser) {
            openDeleteDialog(contextMenuUser);
            toggleContextMenu();
          }
          return false;
        },
      },
    ],
    target: contextMenuTarget,
    onDismiss: toggleContextMenu,
  });

  const columns: IColumn[] = [
    {
      key: "checkbox",
      name: "",
      minWidth: 40,
      maxWidth: 40,
      isResizable: false,
      onRender: () => (
        <input type="checkbox" className={styles.checkbox} />
      ),
    },
    {
      key: "user_name",
      name: "Full Name",
      fieldName: "user_name",
      minWidth: 200,
      maxWidth: 300,
      isResizable: true,
      onRender: (item: UserAccess) => (
        <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
          <Persona
            size={PersonaSize.size32}
            text={item.user_name}
            presence={item.is_active ? PersonaPresence.online : PersonaPresence.offline}
            imageAlt={item.user_name}
          />
          <Text variant="medium" className={styles.userName}>
            {item.user_name}
          </Text>
        </Stack>
      ),
    },
    {
      key: "user_permissions",
      name: "Permissions",
      fieldName: "user_permissions",
      minWidth: 150,
      maxWidth: 200,
      isResizable: true,
      onRender: (item: UserAccess) => (
        <Stack horizontal wrap tokens={{ childrenGap: 4 }}>
          {item.user_permissions.slice(0, 2).map((permission, index) => (
            <span key={index} className={styles.permissionBadge}>
              {permission}
            </span>
          ))}
          {item.user_permissions.length > 2 && (
            <span className={styles.permissionBadge}>
              +{item.user_permissions.length - 2} more
            </span>
          )}
        </Stack>
      ),
    },
    {
      key: "is_active",
      name: "Status",
      fieldName: "is_active",
      minWidth: 100,
      maxWidth: 120,
      isResizable: true,
      onRender: (item: UserAccess) => (
        <span className={`${styles.statusBadge} ${item.is_active ? styles.statusActive : styles.statusInactive}`}>
          {item.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "created_at",
      name: "Created Date",
      fieldName: "created_at",
      minWidth: 120,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: UserAccess) => (
        <Text variant="medium" className={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })}
        </Text>
      ),
    },
    {
      key: "updated_at",
      name: "Updated Date",
      fieldName: "updated_at",
      minWidth: 120,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: UserAccess) => (
        <Text variant="medium" className={styles.dateText}>
          {new Date(item.updated_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })}
        </Text>
      ),
    },
    {
      key: "last_login_at",
      name: "Last Login",
      fieldName: "last_login_at",
      minWidth: 120,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: UserAccess) => (
        <Text variant="medium" className={styles.lastActiveText}>
          {item.last_login_at ? 
            (() => {
              const now = new Date();
              const lastLogin = new Date(item.last_login_at);
              const diffMs = now.getTime() - lastLogin.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMins / 60);
              const diffDays = Math.floor(diffHours / 24);
              
              if (diffMins < 1) return "Just now";
              if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
              if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
              if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
              return "1 month ago";
            })() : "Never"
          }
        </Text>
      ),
    },
    {
      key: "actions",
      name: "Actions",
      minWidth: 100,
      maxWidth: 120,
      isResizable: true,
      onRender: (item: UserAccess) => (
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <IconButton
            iconProps={{ iconName: "Edit" }}
            onClick={() => openEditDialog(item)}
            className={styles.editButton}
            title="Edit user"
          />
          <IconButton
            iconProps={{ iconName: "Delete" }}
            onClick={() => openDeleteDialog(item)}
            className={styles.deleteButton}
            title="Delete user"
          />
        </Stack>
      ),
    },
  ];

  const commandBarItems: ICommandBarItemProps[] = [
    {
      key: "add",
      text: "Add User",
      iconProps: { iconName: "Add" },
      onClick: () => setShowAddDialog(true),
      className: styles.primaryCommand,
    },
    {
      key: "refresh",
      text: "Refresh",
      iconProps: { iconName: "Refresh" },
      onClick: () => {
        loadUsers();
        return false;
      },
    },
  ];

  const activeFilterOptions: IDropdownOption[] = [
    { key: "all", text: "All Users" },
    { key: "active", text: "Active Only" },
    { key: "inactive", text: "Inactive Only" },
  ];

  const sortOptions: IDropdownOption[] = [
    { key: "user_name", text: "User Name" },
    { key: "created_at", text: "Created Date" },
    { key: "updated_at", text: "Updated Date" },
    { key: "last_login_at", text: "Last Login" },
  ];

  return (
    userDetails?.user_permissions?.includes("admin") ? (
    <div className={styles.adminContainer}>
        {/* Header Section */}
        <div className={styles.headerCard}>
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <div className={styles.sbdLogo}>
                <ShieldRegular className={styles.headerIcon} />
              </div>
              <Stack>
                <Text variant="xLarge" className={styles.headerTitle}>
                  User Management
                </Text>
                <Text variant="small" className={styles.headerDescription}>
                  Manage users, permissions, and access control
                </Text>
              </Stack>
            </div>
          </div>
        </div>

      {/* Messages */}
      {error && (
        <MessageBar
          messageBarType={MessageBarType.error}
          onDismiss={() => setError(null)}
          dismissButtonAriaLabel="Close"
          className={styles.messageBar}
        >
          {error}
        </MessageBar>
      )}

      {success && (
        <MessageBar
          messageBarType={MessageBarType.success}
          onDismiss={() => setSuccess(null)}
          dismissButtonAriaLabel="Close"
          className={styles.messageBar}
        >
          {success}
        </MessageBar>
      )}

        {/* Main Content */}
        <div className={styles.contentCard}>
          <div className={styles.contentBody}>
            {/* Action Bar */}
            <div className={styles.actionBar}>
              <Stack horizontal tokens={{ childrenGap: 16 }} verticalAlign="center" wrap>
                <SearchBox
                  placeholder="Search users..."
                  value={searchText}
                  onChange={(_, newValue) => setSearchText(newValue || "")}
                  onSearch={loadUsers}
                  className={styles.searchBox}
                  iconProps={{ iconName: "Search" }}
                />
                <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                  <Text variant="small" className={styles.filterLabel}>Filter:</Text>
                  <Dropdown
                    placeholder="All Users"
                    options={activeFilterOptions}
                    selectedKey={activeFilter}
                    onChange={(_, option) => setActiveFilter(option?.key as string || "all")}
                    className={styles.filterDropdown}
                  />
                  <Dropdown
                    placeholder="All Status"
                    options={[
                      { key: "all", text: "All Status" },
                      { key: "active", text: "Active" },
                      { key: "inactive", text: "Inactive" },
                    ]}
                    selectedKey={activeFilter}
                    onChange={(_, option) => setActiveFilter(option?.key as string || "all")}
                    className={styles.filterDropdown}
                  />
                </Stack>
                <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                  <Text variant="small" className={styles.sortLabel}>Sort:</Text>
                  <Dropdown
                    placeholder="User Name"
                    options={sortOptions}
                    selectedKey={sortBy}
                    onChange={(_, option) => setSortBy(option?.key as string || "user_name")}
                    className={styles.sortDropdown}
                  />
                </Stack>
              </Stack>
              <div className={styles.actionButtons}>
                <PrimaryButton
                  text="Add User"
                  iconProps={{ iconName: "Add" }}
                  onClick={() => setShowAddDialog(true)}
                  className={styles.addButton}
                />
              </div>
            </div>

            {/* Data Table */}
            <div className={styles.tableContainer}>
              {loading ? (
                <div className={styles.loadingContainer}>
                  <Spinner size={SpinnerSize.large} label="Loading users..." />
                </div>
              ) : users.length === 0 ? (
                <div className={styles.emptyState}>
                  <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }}>
                    <ShieldRegular className={styles.emptyStateIcon} />
                    <Text variant="xLarge" className={styles.emptyStateTitle}>
                      No users found
                    </Text>
                    <Text variant="medium" className={styles.emptyStateDescription}>
                      There are no users to display. Add a new user to get started.
                    </Text>
                    <PrimaryButton
                      text="Add User"
                      iconProps={{ iconName: "Add" }}
                      onClick={() => setShowAddDialog(true)}
                      className={styles.addButton}
                    />
                  </Stack>
                </div>
              ) : (
                <DetailsList
                  items={users}
                  columns={columns}
                  selectionMode={SelectionMode.none}
                  className={styles.detailsList}
                />
              )}
            </div>

            {/* Pagination */}
            {users.length > 0 && (
              <div className={styles.paginationContainer}>
                <Stack horizontal tokens={{ childrenGap: 16 }} verticalAlign="center">
                  <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                    <Text variant="medium" className={styles.rowsPerPageLabel}>
                      Rows per page
                    </Text>
                    <Dropdown
                      options={[
                        { key: 10, text: "10" },
                        { key: 25, text: "25" },
                        { key: 50, text: "50" },
                        { key: 100, text: "100" },
                      ]}
                      selectedKey={pageSize}
                      onChange={(_, option) => setPageSize(option?.key as number || 10)}
                      className={styles.rowsPerPageDropdown}
                    />
                    <Text variant="medium" className={styles.rowsInfo}>
                      of {totalCount} rows
                    </Text>
                  </Stack>
                  
                  <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center" className={styles.paginationControls}>
                    <IconButton
                      iconProps={{ iconName: "DoubleChevronLeft" }}
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                      className={styles.paginationButton}
                      title="First page"
                    />
                    <IconButton
                      iconProps={{ iconName: "ChevronLeft" }}
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      className={styles.paginationButton}
                      title="Previous page"
                    />
                    
                    {/* Page Numbers */}
                    <Stack horizontal tokens={{ childrenGap: 4 }}>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        return (
                          <button
                            key={pageNum}
                            className={`${styles.pageButton} ${currentPage === pageNum ? styles.pageButtonActive : ''}`}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <span className={styles.pageEllipsis}>...</span>
                          <button
                            className={styles.pageButton}
                            onClick={() => setCurrentPage(totalPages)}
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </Stack>
                    
                    <IconButton
                      iconProps={{ iconName: "ChevronRight" }}
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      className={styles.paginationButton}
                      title="Next page"
                    />
                    <IconButton
                      iconProps={{ iconName: "DoubleChevronRight" }}
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className={styles.paginationButton}
                      title="Last page"
                    />
                  </Stack>
                </Stack>
              </div>
            )}
          </div>
        </div>

      {/* Add User Dialog */}
      <Dialog
        hidden={!showAddDialog}
        onDismiss={() => setShowAddDialog(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: "Add New User",
        }}
        modalProps={{
          isBlocking: true,
        }}
        className={styles.dialog}
      >
        <Stack tokens={{ childrenGap: 16 }}>
          <TextField
            label="User Name"
            value={userName}
            onChange={(_, newValue) => setUserName(newValue || "")}
            required
            placeholder="Enter user name"
          />
          <ComboBox
            label="User Permissions"
            options={[
              { key: "admin", text: "Admin" },
              { key: "app", text: "App" },
              { key: "none", text: "None" }
            ]}
            selectedKey={userPermissions}
            onChange={(_, option) => {
              if (option) {
                const newPermissions = option.selected 
                  ? [...userPermissions, option.key as string]
                  : userPermissions.filter(p => p !== option.key);
                setUserPermissions(newPermissions);
              }
            }}
            multiSelect
            required
            className={styles.permissionsDropdown}
          />
        </Stack>
        <DialogFooter>
          <PrimaryButton onClick={handleAddUser} text="Add User" disabled={loading} />
          <DefaultButton onClick={() => setShowAddDialog(false)} text="Cancel" />
        </DialogFooter>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        hidden={!showEditDialog}
        onDismiss={() => setShowEditDialog(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: "Edit User",
        }}
        modalProps={{
          isBlocking: true,
        }}
        className={styles.dialog}
      >
        <Stack tokens={{ childrenGap: 16 }}>
          <TextField
            label="User Name"
            value={userName}
            onChange={(_, newValue) => setUserName(newValue || "")}
            required
            placeholder="Enter user name"
          />
          <ComboBox
            label="User Permissions"
            options={[
              { key: "admin", text: "Admin" },
              { key: "app", text: "App" },
              { key: "none", text: "None" }
            ]}
            selectedKey={userPermissions}
            onChange={(_, option) => {
              if (option) {
                const newPermissions = option.selected 
                  ? [...userPermissions, option.key as string]
                  : userPermissions.filter(p => p !== option.key);
                setUserPermissions(newPermissions);
              }
            }}
            multiSelect
            required
            className={styles.permissionsDropdown}
          />
          <Toggle
            label="Active"
            checked={isActive}
            onChange={(_, checked) => setIsActive(checked || false)}
            onText="Active"
            offText="Inactive"
          />
        </Stack>
        <DialogFooter>
          <PrimaryButton onClick={handleEditUser} text="Update User" disabled={loading} />
          <DefaultButton onClick={() => setShowEditDialog(false)} text="Cancel" />
        </DialogFooter>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog
        hidden={!showDeleteDialog}
        onDismiss={() => setShowDeleteDialog(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: "Delete User",
          subText: `Are you sure you want to delete user "${selectedUser?.user_name}"? This action cannot be undone.`,
        }}
        modalProps={{
          isBlocking: true,
        }}
        className={styles.dialog}
      >
        <DialogFooter>
          <PrimaryButton onClick={handleDeleteUser} text="Delete" disabled={loading} />
          <DefaultButton onClick={() => setShowDeleteDialog(false)} text="Cancel" />
        </DialogFooter>
      </Dialog>

      {/* Context Menu */}
      {showContextMenu && (
        <ContextualMenu {...getContextMenuProps()} />
      )}
    </div>
    ) : (
      <Stack 
        className={styles.chatEmptyState}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          padding: '20px'
        }}
      >
        <ShieldProhibitedRegular 
          className={styles.chatIcon} 
          style={{ color: 'red', height: "200px", width: "200px" }} 
        />
        <h1 
          className={styles.chatEmptyStateTitle}
          style={{ 
            margin: '20px 0 10px 0',
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: '#dc2626'
          }}
        >
          Unauthorized Access
        </h1>
        <h2 
          className={styles.chatEmptyStateSubtitle}
          style={{
            margin: '0 0 20px 0',
            fontSize: '1.2rem',
            color: '#6b7280',
            maxWidth: '600px',
            lineHeight: '1.5'
          }}
        >
          You're not authorized to access this page. Please contact the application administrator.
        </h2>
      </Stack>
    )
  );
};

export default Admin;