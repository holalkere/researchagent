import { Button, CommandBarButton, DefaultButton, IButtonProps } from "@fluentui/react";

import styles from './Button.module.css';
import React from "react";

interface ButtonProps extends IButtonProps {
  onClick: () => void;
  text: string | undefined;
}

export const ShareButton: React.FC<ButtonProps> = ({ onClick, text }) => {

  return (
    <CommandBarButton
      className={styles.shareButtonRoot}
      iconProps={{ iconName: 'Share' }}
      onClick={onClick}
      text={text}
    />
  )
}

export const HistoryButton: React.FC<ButtonProps> = ({ onClick, text }) => {
  return (
    <DefaultButton
      className={styles.historyButtonRoot}
      text={text}
      iconProps={{ iconName: 'History' }}
      onClick={onClick}
    />
  )
}

export const AdminButton: React.FC<any> = ({ isMobile }) => {
  return (
    <DefaultButton 
      text="Admin" 
      iconProps={{ iconName: 'Shield' }}
      styles={{
          root: {
              minWidth: 'auto',
              padding: isMobile ? '4px 8px' : '6px 12px',
              fontSize: isMobile ? '12px' : '14px'
          }
          }}
    />
  )
}