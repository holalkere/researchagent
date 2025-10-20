import { Outlet, Link } from "react-router-dom";
import styles from "./Layout.module.css";
import Contoso from "../../assets/Contoso.svg";
import { Stack } from "@fluentui/react";
import { useContext, useEffect, useState } from "react";
import { AdminButton, HistoryButton, ShareButton } from "../../components/common/Button";
import { AppStateContext } from "../../state/AppProvider";
import { CosmosDBStatus } from "../../api";

const Layout = () => {
    const [hideHistoryLabel, setHideHistoryLabel] = useState<string | undefined>("Hide chat history");
    const [showHistoryLabel, setShowHistoryLabel] = useState<string | undefined>("Show chat history");
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const appStateContext = useContext(AppStateContext)
    const ui = appStateContext?.state.frontendSettings?.ui;
    const userDetails = appStateContext?.state.frontendSettings?.user_details;

    const handleHistoryClick = () => {
        appStateContext?.dispatch({ type: 'TOGGLE_CHAT_HISTORY' })
    };

    useEffect(() => { }, [appStateContext?.state.isCosmosDBAvailable.status]);

    useEffect(() => {
        const handleResize = () => {
          const width = window.innerWidth;
          
          // Update responsive states
          setIsMobile(width < 480);
          
          // Update button labels based on screen size
          if (width < 360) {
            setHideHistoryLabel(undefined);
            setShowHistoryLabel(undefined);
          } else if (width < 480) {
            setHideHistoryLabel(undefined);
            setShowHistoryLabel(undefined);
          } else if (width < 768) {
            setHideHistoryLabel("Hide history");
            setShowHistoryLabel("Show history");
          } else {
            setHideHistoryLabel("Hide chat history");
            setShowHistoryLabel("Show chat history");
          }
        };
    
        window.addEventListener('resize', handleResize);
        handleResize(); // Call immediately to set initial state
    
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className={styles.layout}>
            <header className={styles.header} role={"banner"}>
                <div className={styles.headerContent} style={{ padding: isMobile ? '0 8px' : '0 20px' }}>
                    <div className={styles.headerTopRow}>
                        <div className={styles.logoTitleContainer}>
                            <Link to="/" style={{textDecoration: "none", flexShrink: 0}}>
                                <img
                                    src={ui?.logo ? ui.logo : Contoso}
                                    className={styles.headerIcon}
                                    aria-hidden="true"
                                    alt="Logo"
                                />
                            </Link>
                            <Link to="/" className={styles.headerTitleContainer}>
                                <h1 className={styles.headerTitle}>{ui?.title}</h1>
                            </Link>
                        </div>
                        <Stack horizontal tokens={{ childrenGap: isMobile ? 2 : 4 }} className={styles.shareButtonContainer} verticalAlign="center">
                            {(appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured) &&
                                <HistoryButton onClick={handleHistoryClick} text={appStateContext?.state?.isChatHistoryOpen ? hideHistoryLabel : showHistoryLabel} />
                            }
                            {userDetails?.user_permissions && userDetails?.user_permissions?.includes("admin") && (
                            <Link to="/admin" style={{ textDecoration: 'none' }}>
                                <AdminButton isMobile={isMobile} />
                                </Link>
                            )}
                            {/* {ui?.show_share_button && <ShareButton onClick={handleShareClick} text={shareLabel} />} */}
                        </Stack>
                    </div>
                    <div className={styles.headerBottomRow}>
                        <Link to="/" className={styles.headerTitleContainerCentered}>
                            <h1 className={styles.headerTitle}>{ui?.title}</h1>
                        </Link>
                    </div>
                </div>
            </header>
            <Outlet />
            <div style={{
                position: 'fixed',
                bottom: '5px',
                left: '5px',
                color: 'rgba(0, 0, 0, 0.3)',
                padding: '2px 12px',
                borderRadius: '4px',
                fontSize: isMobile ? '10px' : '12px',
                zIndex: 1000,
                maxWidth: isMobile ? 'calc(100vw - 20px)' : 'auto'
            }}>
                <Stack horizontal horizontalAlign="space-between" styles={{ root: { width: '100%' } }}>
                    <Stack.Item align="start" style={{ paddingRight: '10px'}}>{ui?.frontend_version_no}</Stack.Item>
                    <Stack.Item align="end">{ui?.backend_version_no}</Stack.Item>
                </Stack>
            </div>
        </div>
    );
};

export default Layout;
