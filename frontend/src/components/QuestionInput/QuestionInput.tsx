import { useContext, useState } from "react";
import { Stack, TextField } from "@fluentui/react";
import { SendRegular, MicRegular, MicOffRegular } from "@fluentui/react-icons";
import Send from "../../assets/Send.svg";
import styles from "./QuestionInput.module.css";
import { AppStateContext } from "../../state/AppProvider";

interface Props {
    onSend: (question: string, id?: string) => void;
    disabled: boolean;
    placeholder?: string;
    clearOnSend?: boolean;
    conversationId?: string;
}

export const QuestionInput = ({ onSend, disabled, placeholder, clearOnSend, conversationId }: Props) => {
    const [question, setQuestion] = useState<string>("");
    const appStateContext = useContext(AppStateContext);
    const sendQuestion = () => {
        if (disabled || !question.trim()) {
            return;
        }

        if(conversationId){
            onSend(question, conversationId);
        }else{
            onSend(question);
        }

        if (clearOnSend) {
            setQuestion("");
        }
    };

    const onEnterPress = (ev: React.KeyboardEvent<Element>) => {
        if (ev.key === "Enter" && !ev.shiftKey && !(ev.nativeEvent?.isComposing === true)) {
            ev.preventDefault();
            sendQuestion();
        }
    };

    const onQuestionChange = (_ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
        setQuestion(newValue || "");
    };

    const sendQuestionDisabled = disabled || !question.trim();

    return (
        <Stack horizontal className={styles.questionInputContainer}>
            <TextField
                className={styles.questionInputTextArea}
                placeholder={placeholder}
                multiline
                resizable={false}
                borderless
                value={question}
                onChange={onQuestionChange}
                onKeyDown={onEnterPress}
            />
            <div className={styles.questionInputSendButtonContainer} 
                role="button" 
                tabIndex={0}
                aria-label="Ask question button"
            >
                { sendQuestionDisabled ? 
                    <SendRegular className={styles.questionInputSendButtonDisabled}/>
                    
                    :
                    <img onClick={sendQuestion}
                onKeyDown={e => e.key === "Enter" || e.key === " " ? sendQuestion() : null} src={Send} className={styles.questionInputSendButton}/>
                }
            </div>
            <div className={styles.questionInputBottomBorder} />
        </Stack>
    );
};
