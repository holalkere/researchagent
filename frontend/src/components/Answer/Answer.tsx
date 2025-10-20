import { FormEvent, useEffect, useMemo, useState, useContext, useRef } from "react";
import { useBoolean } from "@fluentui/react-hooks";
import {
  Checkbox,
  DefaultButton,
  Dialog,
  FontIcon,
  Image,
  Stack,
  Text,
  TextField,
} from "@fluentui/react";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Button,
} from "@fluentui/react-components";
import DOMPurify from "dompurify";
import { AppStateContext } from "../../state/AppProvider";
import Comp from "../../assets/Comp.svg";
import styles from "./Answer.module.css";

import {
  AskResponse,
  Citation,
  Feedback,
  historyMessageFeedback,
  historyMessageAction
} from "../../api";
import { parseAnswer } from "./AnswerParser";
import Textcopy from "../../assets/Textcopy.svg";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import supersub from "remark-supersub";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { ThumbDislike20Filled, ThumbLike20Filled, Info20Filled } from "@fluentui/react-icons";
import { XSSAllowTags } from "../../constants/xssAllowTags";

import { CheckmarkCircleRegular } from "@fluentui/react-icons"; // Importing Checkmark icon from Fluent UI
import { Spinner, SpinnerSize } from "@fluentui/react"; // Importing Spinner from Fluent UI
import rehypeRaw from "rehype-raw";

let spinnerStyles = {
  circle: {
    height: 100,
    width: 100,
    borderWidth: 4,
  },
};

interface Props {
  answer: AskResponse;
  onCitationClicked: (citedDocument: Citation) => void;
  isLoading: boolean;
  progressItems: Array<string>;
  onHandleCopyChat:() => void;
}

export const Answer = ({
  answer,
  onCitationClicked,
  isLoading = false,
  progressItems,
  onHandleCopyChat
}: Props) => {
  console.log(answer)
  
  if(answer.actions == undefined){
    answer.actions = {
      "isCitationOpened" : false,
      "isDetailedAnswerOpened":false,
      "isReferenceOpened":false
    }
  }

  const copyCitation = JSON.parse(JSON.stringify(answer.citations??[]));
  console.log("copyCitation",copyCitation)
  if(answer.events){
    progressItems = answer.events
  }
  console.log(progressItems, "inside Answer");
  const initializeAnswerFeedback = (answer: AskResponse) => {
    if (answer.message_id == undefined) return undefined;
    if (answer.feedback == undefined) return undefined;
    if (answer.feedback.split(",").length > 1) return Feedback.Negative;
    if (Object.values(Feedback).includes(answer.feedback))
      return answer.feedback;
    return Feedback.Neutral;
  };

  const [isRefAccordionOpen, { toggle: toggleIsRefAccordionOpen }] =
    useBoolean(false);
  const filePathTruncationLimit = 50;
  
  const parsedAnswer = useMemo(() => parseAnswer(answer), [answer]);
  const [chevronIsExpanded, setChevronIsExpanded] =
    useState(isRefAccordionOpen);
  const [detailedAnswerExpanded, setDetailedAnswerExpanded] = useState(false);
  const [feedbackState, setFeedbackState] = useState(
    initializeAnswerFeedback(answer)
  );
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isComparatorDialogOpen, setIsComparatorDialogOpen] = useState(false);
  const [showReportInappropriateFeedback, setShowReportInappropriateFeedback] =
    useState(false);
  const [negativeFeedbackList, setNegativeFeedbackList] = useState<Feedback[]>(
    []
  );
  const [otherFeedbackText, setOtherFeedbackText] = useState("");
  const [otherHarmfulText, setOtherHarmfulText] = useState("");
  const appStateContext = useContext(AppStateContext);
  const FEEDBACK_ENABLED =
    appStateContext?.state.frontendSettings?.feedback_enabled &&
    appStateContext?.state.isCosmosDBAvailable?.cosmosDB;
  const SANITIZE_ANSWER =
    appStateContext?.state.frontendSettings?.sanitize_answer;

  const handleChevronClick = async() => {
    setChevronIsExpanded(!chevronIsExpanded);
    toggleIsRefAccordionOpen();
    if (answer.actions && !answer.actions.isReferenceOpened){
      answer.actions.isReferenceOpened = true;
      if (answer.message_id == undefined) return;
      await historyMessageAction(answer.message_id, 'isReferenceOpened')
    }
  };

  const handleCitationClick = async (citation:Citation) => {
    if (answer.actions && !answer.actions.isCitationOpened){
      answer.actions.isCitationOpened = true;
      if (answer.message_id == undefined) return;
      await historyMessageAction(answer.message_id, 'isCitationOpened');
    }
    onCitationClicked(citation);
  }

  const [isComparatorHidden, { toggle: toggleComparator }] = useBoolean(true);

  useEffect(() => {
    setChevronIsExpanded(isRefAccordionOpen);
  }, [isRefAccordionOpen]);

  useEffect(() => {
    if (answer.message_id == undefined) return;

    let currentFeedbackState;
    if (
      appStateContext?.state.feedbackState &&
      appStateContext?.state.feedbackState[answer.message_id]
    ) {
      currentFeedbackState =
        appStateContext?.state.feedbackState[answer.message_id];
    } else {
      currentFeedbackState = initializeAnswerFeedback(answer);
    }
    setFeedbackState(currentFeedbackState);
  }, [appStateContext?.state.feedbackState, feedbackState, answer.message_id]);

  const createCitationFilepath = (
    citation: Citation,
    index: number,
    truncate: boolean = false
  ) => {
    let citationFilename = "";

    if (citation.filepath) {
      citation.filepath = citation.filepath.split("___")[0];
      const part_i =
        citation.part_index ??
        (citation.chunk_id ? parseInt(citation.chunk_id) + 1 : "");
      if (truncate && citation.filepath.length > filePathTruncationLimit) {
        const citationLength = citation.filepath.length;
        citationFilename = `${citation.filepath.substring(
          0,
          20
        )}...${citation.filepath.substring(
          citationLength - 20
        )}`;
      } else {
        citationFilename = `${citation.filepath}`;
      }
    } else if (citation.filepath && citation.reindex_id) {
      citationFilename = `${citation.filepath}`;
    } else {
      citationFilename = `Citation ${index}`;
    }
    return citationFilename;
  };

  const onLikeResponseClicked = async () => {
    if (answer.message_id == undefined) return;

    let newFeedbackState = feedbackState;
    // Set or unset the thumbs up state
    if (feedbackState == Feedback.Positive) {
      newFeedbackState = Feedback.Neutral;
    } else {
      newFeedbackState = Feedback.Positive;
    }
    appStateContext?.dispatch({
      type: "SET_FEEDBACK_STATE",
      payload: { answerId: answer.message_id, feedback: newFeedbackState },
    });
    setFeedbackState(newFeedbackState);

    // Update message feedback in db
    await historyMessageFeedback(answer.message_id, newFeedbackState);
  };

  const onDislikeResponseClicked = async () => {
    if (answer.message_id == undefined) return;

    let newFeedbackState = feedbackState;
    if (
      feedbackState === undefined ||
      feedbackState === Feedback.Neutral ||
      feedbackState === Feedback.Positive
    ) {
      newFeedbackState = Feedback.Negative;
      setFeedbackState(newFeedbackState);
      setIsFeedbackDialogOpen(true);
    } else {
      // Reset negative feedback to neutral
      newFeedbackState = Feedback.Neutral;
      setFeedbackState(newFeedbackState);
      await historyMessageFeedback(answer.message_id, Feedback.Neutral);
    }
    appStateContext?.dispatch({
      type: "SET_FEEDBACK_STATE",
      payload: { answerId: answer.message_id, feedback: newFeedbackState },
    });
  };
  const chatRef = useRef(null);
  const handleCopyChat = () => {
    onHandleCopyChat();
    if (chatRef.current) {
        // Select the chat content
        // chatRef.current.select();
        // Copy the selected text
        document.execCommand('copy');
        // Deselect the text after copying
      //  window.getSelection().removeAllRanges();
        // Optional: Display a message indicating that the text has been copied
        alert('Chat copied to clipboard!');
    }
  };

  const updateFeedbackList = (
    ev?: FormEvent<HTMLElement | HTMLInputElement>,
    checked?: boolean
  ) => {
    if (answer.message_id == undefined) return;
    let selectedFeedback = (ev?.target as HTMLInputElement)?.id as Feedback;

    let feedbackList = negativeFeedbackList.slice();
    if (checked) {
      feedbackList.push(selectedFeedback);
    } else {
      feedbackList = feedbackList.filter((f) => f !== selectedFeedback);
    }

    setNegativeFeedbackList(feedbackList);
  };

  const onSubmitNegativeFeedback = async () => {
    if (answer.message_id == undefined) return;
    
    // Include the "Other" feedback text if provided
    let feedbackString = negativeFeedbackList.join(",");
    if (otherFeedbackText.trim()) {
      feedbackString += `: ${otherFeedbackText.trim()}`;
    }
    if (otherHarmfulText.trim()) {
      feedbackString += `: ${otherHarmfulText.trim()}`;
    }
    
    await historyMessageFeedback(
      answer.message_id,
      feedbackString
    );
    resetFeedbackDialog();
  };

  const resetFeedbackDialog = () => {
    setIsFeedbackDialogOpen(false);
    setShowReportInappropriateFeedback(false);
    setNegativeFeedbackList([]);
    setOtherFeedbackText("");
    setOtherHarmfulText("");
  };

  const unhelpfulFeedbackContent = useMemo(() => (
    <>
      <div>Why wasn't this response helpful?</div>
      <Stack tokens={{ childrenGap: 4 }}>
        <Checkbox
          label="Citations are missing"
          id={Feedback.MissingCitation}
          checked={negativeFeedbackList.includes(
            Feedback.MissingCitation
          )}
          onChange={updateFeedbackList}
        ></Checkbox>
        <Checkbox
          label="Citations are wrong"
          id={Feedback.WrongCitation}
          checked={negativeFeedbackList.includes(
            Feedback.WrongCitation
          )}
          onChange={updateFeedbackList}
        ></Checkbox>
        <Checkbox
          label="The response is not from my data"
          id={Feedback.OutOfScope}
          checked={negativeFeedbackList.includes(Feedback.OutOfScope)}
          onChange={updateFeedbackList}
        ></Checkbox>
        <Checkbox
          label="Inaccurate or irrelevant"
          id={Feedback.InaccurateOrIrrelevant}
          checked={negativeFeedbackList.includes(
            Feedback.InaccurateOrIrrelevant
          )}
          onChange={updateFeedbackList}
        ></Checkbox>
        <Checkbox
          label="Other"
          id={Feedback.OtherUnhelpful}
          checked={negativeFeedbackList.includes(
            Feedback.OtherUnhelpful
          )}
          onChange={updateFeedbackList}
        ></Checkbox>
          <TextField
            placeholder="Please provide more details..."
            multiline
            rows={3}
            value={otherFeedbackText}
            onChange={(_, newValue) => setOtherFeedbackText(newValue || "")}
            styles={{
              root: { marginTop: 8 },
              field: { fontSize: 14 }
            }}
          />
      </Stack>
      <div
        onClick={() => setShowReportInappropriateFeedback(true)}
        style={{ color: "#115EA3", cursor: "pointer" }}
      >
        Report inappropriate content
      </div>
    </>
  ), [negativeFeedbackList, otherFeedbackText]);

  const reportInappropriateFeedbackContent = useMemo(() => (
    <>
      <div>
        The content is <span style={{ color: "red" }}>*</span>
      </div>
      <Stack tokens={{ childrenGap: 4 }}>
        <Checkbox
          label="Hate speech, stereotyping, demeaning"
          id={Feedback.HateSpeech}
          checked={negativeFeedbackList.includes(Feedback.HateSpeech)}
          onChange={updateFeedbackList}
        ></Checkbox>
        <Checkbox
          label="Violent: glorification of violence, self-harm"
          id={Feedback.Violent}
          checked={negativeFeedbackList.includes(Feedback.Violent)}
          onChange={updateFeedbackList}
        ></Checkbox>
        <Checkbox
          label="Sexual: explicit content, grooming"
          id={Feedback.Sexual}
          checked={negativeFeedbackList.includes(Feedback.Sexual)}
          onChange={updateFeedbackList}
        ></Checkbox>
        <Checkbox
          label="Manipulative: devious, emotional, pushy, bullying"
          checked={negativeFeedbackList.includes(
            Feedback.Manipulative
          )}
          id={Feedback.Manipulative}
          onChange={updateFeedbackList}
        ></Checkbox>
        <Checkbox
          label="Other"
          id={Feedback.OtherHarmful}
          checked={negativeFeedbackList.includes(
            Feedback.OtherHarmful
          )}
          onChange={updateFeedbackList}
        ></Checkbox>
          <TextField
            placeholder="Please provide more details..."
            multiline
            rows={3}
            value={otherHarmfulText}
            onChange={(_, newValue) => setOtherHarmfulText(newValue || "")}
            styles={{
              root: { marginTop: 8 },
              field: { fontSize: 14 }
            }}
          />
      </Stack>
    </>
  ), [negativeFeedbackList, otherHarmfulText]);

  const components = {
    code({ node, ...props }: { node: any; [key: string]: any }) {

      let language = 'text';
      if (props.className) {
        const match = props.className.match(/language-(\w+)/);
        language = match ? match[1] : 'text';
      }
      const codeString = node.children[0].value ?? "";
      return (
        <SyntaxHighlighter
          customStyle={{
            backgroundColor: '#282a36',
            color: '#f8f8f2',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            lineHeight: '1.5'
          }}
          language={language}
          PreTag="div"
        >
          {codeString}
        </SyntaxHighlighter>
      );
    },
  };

  const handleDetailedAnswerClick = async() => {
    setDetailedAnswerExpanded(!detailedAnswerExpanded);
    if (answer.actions && !answer.actions.isDetailedAnswerOpened){
      answer.actions.isDetailedAnswerOpened = true;
      if (answer.message_id == undefined) return;
      await historyMessageAction(answer.message_id, 'isDetailedAnswerOpened')
    }
  };

  return (
    <>
      <Stack className={styles.answerContainer} tabIndex={0}>
        <Stack.Item style={{width:'100%'}}>
          <Stack horizontal grow>
            <Stack.Item grow>
              {progressItems && progressItems.length > 0 ? (
                <Accordion collapsible>
                  <AccordionItem value="1">
                    <AccordionHeader>
                      <div className={styles.shiningText}>
                        <span className={styles.shiningEffect}>
                          {progressItems && progressItems.length > 0
                            ? progressItems[progressItems.length - 1]
                            : ""}
                        </span>
                      </div>
                    </AccordionHeader>
                    <AccordionPanel>
                      <div>
                        {progressItems && progressItems.length > 0
                          ? progressItems.map((item, index) => (
                              <div
                                key={index}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  marginBottom: "8px",
                                }}
                              >
                                {index === progressItems.length - 1 &&
                                isLoading ? (
                                  <Spinner size={SpinnerSize.xSmall} />
                                ) : (
                                  <CheckmarkCircleRegular />
                                )}
                                <span style={{ marginLeft: "8px" }}>
                                  {item}
                                </span>
                              </div>
                            ))
                          : ""}
                      </div>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              ) : (
                ""
              )}
            </Stack.Item>
            <Stack.Item className={styles.answerHeader}>
              <Stack horizontal horizontalAlign="space-between">
              {/* {copyCitation && copyCitation.length > 0?<Info20Filled onClick={() => setIsComparatorDialogOpen(true)}></Info20Filled>:<></>} */}
             
              {FEEDBACK_ENABLED && answer.message_id !== undefined && (
                  <> <div className="tooltip-container">
                <img src={Textcopy}  aria-hidden="false"
                    aria-label="Copy this content"
                    style={{height:'18px', width:'18px', cursor:'pointer'}}  onClick={handleCopyChat}/>  
                {/* <CopyFilled
                    className={styles.clearChatBroom}
                    aria-hidden="false"
                    aria-label="Copy this content"
                    title="Copy"
                    onClick={handleCopyChat}
                    style={{ color: "slategray", cursor: "pointer", fontSize: '18px' }}
                /> */}
                <div className="tooltip">Copy</div>
              </div><ThumbLike20Filled
                    aria-hidden="false"
                    aria-label="Like this response"
                    onClick={() => onLikeResponseClicked()}
                    style={
                      feedbackState === Feedback.Positive ||
                      appStateContext?.state.feedbackState[
                        answer.message_id
                      ] === Feedback.Positive
                        ? { color: "darkgreen", cursor: "pointer" }
                        : { color: "slategray", cursor: "pointer" }
                    }
                  />
                  <ThumbDislike20Filled
                    aria-hidden="false"
                    aria-label="Dislike this response"
                    onClick={() => onDislikeResponseClicked()}
                    style={
                      feedbackState !== Feedback.Positive &&
                      feedbackState !== Feedback.Neutral &&
                      feedbackState !== undefined
                        ? { color: "darkred", cursor: "pointer" }
                        : { color: "slategray", cursor: "pointer" }
                    }
                  /></>
                  )}
                  </Stack>
            </Stack.Item>
          </Stack>
        </Stack.Item>
        <Stack.Item>
        <ReactMarkdown
                linkTarget="_blank"
                remarkPlugins={[remarkGfm, supersub]}
                rehypePlugins={[rehypeRaw]}
                children={
                  SANITIZE_ANSWER
                    ? DOMPurify.sanitize(parsedAnswer.markdownFormatText, {
                        ALLOWED_TAGS: XSSAllowTags,
                      })
                    : parsedAnswer.markdownFormatText
                }
                skipHtml={false}
                className={styles.answerText}
                components={components}
              />
        </Stack.Item>

        {/* Detailed Answer Section */}
        {parsedAnswer.detailedBreakdown && parsedAnswer.detailedBreakdown.length > 0 && (
        <Stack.Item style={{paddingBottom:"5px", marginRight:"11px"}}>
          <Stack horizontal horizontalAlign="start" verticalAlign="center">
            <Text
              className={styles.accordionTitle}
              onClick={handleDetailedAnswerClick}
              aria-label="Toggle detailed answer"
              tabIndex={0}
              role="button"
            >
              <span>Detailed Answer</span>
            </Text>
            <FontIcon
              className={styles.accordionIcon}
              onClick={handleDetailedAnswerClick}
              iconName={detailedAnswerExpanded ? "ChevronDown" : "ChevronRight"}
            />
          </Stack>
          {detailedAnswerExpanded && (
            <Stack style={{ padding: "10px"}}>
              <ReactMarkdown
                linkTarget="_blank"
                remarkPlugins={[remarkGfm, supersub]}
                rehypePlugins={[rehypeRaw]}
                children={
                  SANITIZE_ANSWER
                    ? DOMPurify.sanitize(parsedAnswer.detailedBreakdown || "", {
                      ALLOWED_TAGS: XSSAllowTags,
                    })
                    : parsedAnswer.detailedBreakdown || ""
                }
                skipHtml={false}
                className={styles.answerText}
                components={components}
              />
            </Stack>
          )}
        </Stack.Item>
        )}

        <Stack.Item style={{paddingBottom:"5px", margin:"0px 11px"}}>
          {/* <Stack>
            <Stack horizontal>
              {copyCitation.length > 0 ? 
              <>
            <Text
                    className={styles.accordionTitle}
                    onClick={toggleComparator}
                    aria-label="Open Comparator"
                    tabIndex={0}
                    role="button"
                  >
                    <span>
                      Product Comparator
                    </span>
                  </Text>
                  <FontIcon
                    className={styles.accordionIcon}
                    onClick={toggleComparator}
                    iconName={
                      isComparatorHidden ? "ChevronRight" : "ChevronDown"
                    }
                  /> </>: <></>}
                  </Stack>
          </Stack>
          <Stack horizontal grow style={{maxWidth:"75vw", overflowX:"auto"}}>
           { isComparatorHidden?<></>:<Comparator data={copyCitation} isDialog={false}></Comparator>}
           </Stack> */}
        </Stack.Item>
        <Stack horizontal className={styles.answerFooter}>
          {!!parsedAnswer.citations.length && (
            <Stack.Item
              onKeyDown={(e) =>
                e.key === "Enter" || e.key === " "
                  ? toggleIsRefAccordionOpen()
                  : null
              }
            >
              <Stack style={{ width: "100%" }}>
                <Stack
                  horizontal
                  horizontalAlign="start"
                  verticalAlign="center"
                  onClick={handleChevronClick}
                >
                  <Text
                    className={styles.accordionTitle}
                    // onClick={toggleIsRefAccordionOpen}
                    aria-label="Open references"
                    tabIndex={0}
                    role="button"
                  >
                    <span>
                      {parsedAnswer.citations.filter(citation => citation['color'] === 'lightgreen').length > 1
                        ? parsedAnswer.citations.filter(citation => citation['color'] === 'lightgreen').length + " references"
                        : parsedAnswer.citations.filter(citation => citation['color'] === 'lightgreen').length === 1
                        ? "1 reference"
                        : "No references"}
                    </span>
                  </Text>
                  <FontIcon
                    className={styles.accordionIcon}
                    // onClick={handleChevronClick}
                    iconName={
                      chevronIsExpanded ? "ChevronDown" : "ChevronRight"
                    }
                  />
                </Stack>
              </Stack>
            </Stack.Item>
          )}
          <Stack.Item className={styles.answerDisclaimerContainer}>
            <span className={styles.answerDisclaimer}>
              AI-generated content may be incorrect
            </span>
          </Stack.Item>
        </Stack>
        {chevronIsExpanded && 
            <Stack style={{  display: "flex", flexFlow: "wrap row", maxHeight: "800px", gap: "4px", alignItems:"flex-start"}}>
                {parsedAnswer.citations.map((citation, idx) => {
                    return citation['color'] === 'lightgreen' ? (
                        <span 
                        style={{background: citation['color']}}
                            title={createCitationFilepath(citation, ++idx)} 
                            tabIndex={0} 
                            role="link" 
                            key={idx} 
                            onClick={() => handleCitationClick(citation)} 
                            onKeyDown={e => e.key === "Enter" || e.key === " " ? handleCitationClick(citation) : null}
                            className={styles.citationContainer}
                            aria-label={createCitationFilepath(citation, idx)}
                        >
                            <div className={styles.citation}>{citation.doc_number}</div>
                            {createCitationFilepath(citation, idx, true)}
                        </span>
                    ) : null;
                })}
            </Stack>
        }
      </Stack>
     
      <Dialog
        onDismiss={() => {
          resetFeedbackDialog();
          setFeedbackState(Feedback.Neutral);
        }}
        hidden={!isFeedbackDialogOpen}
        styles={{
          main: [
            {
              selectors: {
                ["@media (min-width: 480px)"]: {
                  maxWidth: "600px",
                  background: "#FFFFFF",
                  boxShadow:
                    "0px 14px 28.8px rgba(0, 0, 0, 0.24), 0px 0px 8px rgba(0, 0, 0, 0.2)",
                  borderRadius: "8px",
                  maxHeight: "600px",
                  minHeight: "100px",
                },
              },
            },
          ],
        }}
        dialogContentProps={{
          title: "Submit Feedback",
          showCloseButton: true,
        }}
      >
        <Stack tokens={{ childrenGap: 4 }}>
          <div>Your feedback will improve this experience.</div>

          {!showReportInappropriateFeedback ? (
            unhelpfulFeedbackContent
          ) : (
            reportInappropriateFeedbackContent
          )}

          <div>
            By pressing submit, your feedback will be visible to the application
            owner.
          </div>

          <DefaultButton
            disabled={negativeFeedbackList.length < 1}
            onClick={onSubmitNegativeFeedback}
          >
            Submit
          </DefaultButton>
        </Stack>
      </Dialog>  
      
    </>
  );
};
