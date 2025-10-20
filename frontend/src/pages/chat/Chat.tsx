import {
  useRef,
  useState,
  useEffect,
  useContext,
  useLayoutEffect,
} from "react";
import {
  IContextualMenuProps,
  CommandBarButton,
  IconButton,
  Dialog,
  DialogType,
  Stack,
} from "@fluentui/react";
import {
  SquareRegular,
  ShieldLockRegular,
  ErrorCircleRegular,
  ShieldProhibitedRegular
} from "@fluentui/react-icons";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import uuid from "react-uuid";
import { Dictionary, isEmpty } from "lodash";
import DOMPurify from "dompurify";

import styles from "./Chat.module.css";
import Contoso from "../../assets/Contoso.svg";
import { XSSAllowTags } from "../../constants/xssAllowTags";
import * as signalR from "@microsoft/signalr";

// for multi-lines chat_description
import React, { useCallback } from "react";

import {
  ChatMessage,
  ConversationRequest,
  conversationApi,
  Citation,
  ToolMessageContent,
  ChatResponse,
  getUserInfo,
  Conversation,
  historyGenerate,
  historyUpdate,
  historyClear,
  ChatHistoryLoadingState,
  CosmosDBStatus,
  ErrorMessage,
} from "../../api";
import { Answer } from "../../components/Answer";
import { QuestionInput } from "../../components/QuestionInput";
import { ChatHistoryPanel } from "../../components/ChatHistory/ChatHistoryPanel";
import { AppStateContext } from "../../state/AppProvider";
import { useBoolean } from "@fluentui/react-hooks";
import RochelleAvatar from '../../assets/avatar.png';
import { Link } from "react-router-dom";
import { ProductInfoLayout, ProductPartsLayout, LicenseInformationLayout, OrderDetailsLayout, WhereToBuyLayout, InventoryStatusLayout } from "../../components/CitationLayout";

const enum messageStatus {
  NotRunning = "Not Running",
  Processing = "Processing",
  Done = "Done",
}

const Chat = () => {
  const appStateContext = useContext(AppStateContext);
  const ui = appStateContext?.state.frontendSettings?.ui;
  const ticketId = appStateContext?.state.ticketId;
  const AUTH_ENABLED = appStateContext?.state.frontendSettings?.auth_enabled;
  const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showLoadingMessage, setShowLoadingMessage] = useState<boolean>(false);
  const [activeCitation, setActiveCitation] = useState<Citation>();
  const [isCitationPanelOpen, setIsCitationPanelOpen] =
    useState<boolean>(false);
  const abortFuncs = useRef([] as AbortController[]);
  const [showAuthMessage, setShowAuthMessage] = useState<boolean | undefined>(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [processMessages, setProcessMessages] = useState<messageStatus>(
    messageStatus.NotRunning
  );
  const [clearingChat, setClearingChat] = useState<boolean>(false);
  const [hideErrorDialog, { toggle: toggleErrorDialog }] = useBoolean(true);
  const [errorMsg, setErrorMsg] = useState<ErrorMessage | null>();

   
  const userDetails = appStateContext?.state.frontendSettings?.user_details;
  const [showAccessMessage, setShowAccessMessage] = useState<boolean | undefined>(true);

  const [selectedOption, setSelectedOption] = useState("sbd-gpt-35-turbo-16k");

  const errorDialogContentProps = {
    type: DialogType.close,
    title: errorMsg?.title,
    closeButtonAriaLabel: "Close",
    subText: errorMsg?.subtitle,
  };

  const modalProps = {
    titleAriaId: "labelId",
    subtitleAriaId: "subTextId",
    isBlocking: true,
    styles: { main: { maxWidth: 450, selectors:{
      ["@media (max-width: 480px)"]: {
        maxWidth: "95%",
        width: "95%"
      }
    } } },
  };

  const [ASSISTANT, TOOL, ERROR] = ["assistant", "tool", "error"];
  const NO_CONTENT_ERROR = "No content in messages object.";

  useEffect(() => {
    if (
      appStateContext?.state.isCosmosDBAvailable?.status !==
        CosmosDBStatus.Working &&
      appStateContext?.state.isCosmosDBAvailable?.status !==
        CosmosDBStatus.NotConfigured &&
      appStateContext?.state.chatHistoryLoadingState ===
        ChatHistoryLoadingState.Fail &&
      hideErrorDialog
    ) {
      let subtitle = `${appStateContext.state.isCosmosDBAvailable.status}. Please contact the site administrator.`;
      setErrorMsg({
        title: "Chat history is not enabled",
        subtitle: subtitle,
      });
      toggleErrorDialog();
    }
  }, [appStateContext?.state.isCosmosDBAvailable]);

  const handleErrorDialogClose = () => {
    toggleErrorDialog();
    setTimeout(() => {
      setErrorMsg(null);
    }, 500);
  };

  useEffect(() => {
    setIsLoading(
      appStateContext?.state.chatHistoryLoadingState ===
        ChatHistoryLoadingState.Loading
    );
  }, [appStateContext?.state.chatHistoryLoadingState]);

  const getUserInfoList = async () => {
    if (!AUTH_ENABLED) {
      setShowAuthMessage(false);
      return;
    }
    const userInfoList = await getUserInfo();
        if (userInfoList.length === 0 && window.location.hostname !== "127.0.0.1") {
      setShowAuthMessage(true);
    } else {
      setShowAuthMessage(false);
    }
  };

  const getUserAccessDetails = async () => {
    console.log("userDetails", userDetails);
    if (userDetails !== undefined && userDetails !== null && userDetails.user_permissions !== undefined && userDetails.user_permissions.length > 0 && (userDetails.user_permissions.includes("admin") || userDetails.user_permissions.includes("app"))) {
        setShowAuthMessage(false);
        setShowAccessMessage(false);
    }
    else if (userDetails === undefined || userDetails === null) {
      setShowAccessMessage(false);
    }
    else {
        setShowAccessMessage(true);
    }
}

  const [progressItems, setProgressItems] = useState<Record<string, string[]>>(
    {}
  );
  let eventSource: EventSource | null;
  const eventTrigger = async (id: string) => {
    return await new Promise((resolve, reject) => {
      setProgressItems((prevItems) => {
        prevItems[id] = ["Analyzing question."];
        return prevItems;
      });
      var connection: any = new signalR.HubConnectionBuilder()
          .withUrl(appStateContext?.state.frontendSettings?.events_url?appStateContext?.state.frontendSettings?.events_url:"http://localhost:7071")
          .build();
      connection.on(id, (message:string) => {
        console.log(message);
        if (message == "close" && connection) {
          connection.stop().then((res:any) => console.log(res))
          connection = null;
          let temp = progressItems;
          temp[id].push("Analyzed");
          setProgressItems({ ...temp });
          return;
        }
        let temp = progressItems;
        temp[id].push(message);
        setProgressItems({ ...temp });
        console.log(progressItems);
      });

      connection.start().then((res:any) => {console.log(res);resolve(connection)})
        .catch((err:any) => {console.log("error occurred in subscribing events"); console.error(err)});
    });
  };

  let assistantMessage = {} as ChatMessage;
  let toolMessage = {} as ChatMessage;
  let assistantContent = "";

  const processResultMessage = (
    resultMessage: ChatMessage,
    userMessage: ChatMessage,
    conversationId?: string
  ) => {
    if (resultMessage.role === ASSISTANT) {
      assistantContent += resultMessage.content;
      assistantMessage = resultMessage;
      assistantMessage.content = assistantContent;
      assistantMessage.events = progressItems[userMessage.id]

      if (resultMessage.context) {
        toolMessage = {
          id: uuid(),
          role: TOOL,
          content: resultMessage.context,
          date: new Date().toISOString(),
        };
      }
    }

    if (resultMessage.role === TOOL) toolMessage = resultMessage;

    if (!conversationId) {
      isEmpty(toolMessage)
        ? setMessages([...messages, userMessage, assistantMessage])
        : setMessages([
            ...messages,
            userMessage,
            toolMessage,
            assistantMessage,
          ]);
    } else {
      isEmpty(toolMessage)
        ? setMessages([...messages, assistantMessage])
        : setMessages([...messages, toolMessage, assistantMessage]);
    }
    console.log(messages);
  };

  const onHandleCopyChats=(message:any) =>{
    // console.log(message)
    let answerobj:{Direct_short_answer:string, Detailed_breakdown:string};
    try{
      answerobj = JSON.parse(message)
    }
    catch(e){
      answerobj = {
        Direct_short_answer: message,
        Detailed_breakdown: ""
      }
    }
    console.log(message)
    console.log(answerobj)
    const MatchCitationLinks = answerobj.Direct_short_answer.match(/\[(doc\d\d?\d?)]/g);
    const lengthDocN = "[doc".length;
    const matchedCitationsIndex = MatchCitationLinks?.map(
      (link:any) => Number(link.slice(lengthDocN, link.length - 1))
    );
    matchedCitationsIndex?.forEach((i:any) => {
      answerobj.Direct_short_answer = answerobj.Direct_short_answer.replaceAll("[doc" + (i + 1) + "]", `<sup>${i + 1}</sup>`);
    });
    
    const textToCopy = answerobj.Direct_short_answer;
    navigator.clipboard.writeText(textToCopy)
    .then(() => {
      console.log('Text copied to clipboard:', textToCopy);
      // You can add any additional actions after successful copy
    })
    .catch(err => {
      console.error('Error copying text to clipboard:', err);
      // Handle error if copy fails
    });
  }

  const makeApiRequestWithoutCosmosDB = async (
    question: string,
    conversationId?: string
  ) => {
    setIsLoading(true);
    setShowLoadingMessage(true);
    const abortController = new AbortController();
    abortFuncs.current.unshift(abortController);

    const userMessage: ChatMessage = {
      id: uuid(),
      role: "user",
      content: question,
      date: new Date().toISOString(),
    };

    let conversation: Conversation | null | undefined;
    if (!conversationId) {
      conversation = {
        id: conversationId ?? uuid(),
        title: question,
        messages: [userMessage],
        date: new Date().toISOString(),
      };
    } else {
      conversation = appStateContext?.state?.currentChat;
      if (!conversation) {
        console.error("Conversation not found.");
        setIsLoading(false);
        setShowLoadingMessage(false);
        abortFuncs.current = abortFuncs.current.filter(
          (a) => a !== abortController
        );
        return;
      } else {
        conversation.messages.push(userMessage);
      }
    }

    appStateContext?.dispatch({
      type: "UPDATE_CURRENT_CHAT",
      payload: conversation,
    });
    setMessages(conversation.messages);

    const request: ConversationRequest = {
      messages: [
        ...conversation.messages.filter((answer) => answer.role !== ERROR),
      ],
    };

    let result = {} as ChatResponse;
    try {
      const [eventConnection, response] = await Promise.all([
        eventTrigger(userMessage["id"]),
        conversationApi(request, abortController.signal)
      ]);

      if (response?.body) {
        const reader = response.body.getReader();

        let runningText = "";
        while (true) {
          setProcessMessages(messageStatus.Processing);
          const { done, value } = await reader.read();
          if (done) break;

          var text = new TextDecoder("utf-8").decode(value);
          const objects = text.split("\n");
          objects.forEach((obj) => {
            try {
              if (obj !== "" && obj !== "{}") {
                runningText += obj;
                result = JSON.parse(runningText);
                if (result.choices?.length > 0) {
                  result.choices[0].messages.forEach((msg) => {
                    msg.id = result.id;
                    msg.date = new Date().toISOString();
                  });
                  if (
                    result.choices[0].messages?.some(
                      (m) => m.role === ASSISTANT
                    )
                  ) {
                    setShowLoadingMessage(false);
                  }
                  result.choices[0].messages.forEach((resultObj) => {
                    processResultMessage(
                      resultObj,
                      userMessage,
                      conversationId
                    );
                  });
                } else if (result.error) {
                  throw Error(result.error);
                }
                else if(result.message){
                  throw Error(result.message)
                }
                runningText = "";
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) {
                console.error(e);
                throw e;
              } else {
                console.log("Incomplete message. Continuing...");
              }
            }
          });
        }
        conversation.messages.push(toolMessage, assistantMessage);
        appStateContext?.dispatch({
          type: "UPDATE_CURRENT_CHAT",
          payload: conversation,
        });
        setMessages([...messages, toolMessage, assistantMessage]);
      }
    } catch (e) {
      if (!abortController.signal.aborted) {
        let errorMessage =
          "An error occurred. Please try again. If the problem persists, please contact the site administrator.";
        if (result.error?.message) {
          errorMessage = result.error.message;
        } else if (typeof result.error === "string") {
          errorMessage = result.error;
        }

        errorMessage = parseErrorMessage(errorMessage);

        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: errorMessage,
          date: new Date().toISOString(),
        };
        conversation.messages.push(errorChatMsg);
        appStateContext?.dispatch({
          type: "UPDATE_CURRENT_CHAT",
          payload: conversation,
        });
        setMessages([...messages, errorChatMsg]);
      } else {
        console.log(e);
        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: "Error Occured",
          date: new Date().toISOString(),
        };
        setMessages([...messages, errorChatMsg]);
      }
    } finally {
      setIsLoading(false);
      setShowLoadingMessage(false);
      abortFuncs.current = abortFuncs.current.filter(
        (a) => a !== abortController
      );
      setProcessMessages(messageStatus.Done);
    }

    return abortController.abort();
  };
  var resultConversation:Conversation|undefined;
  const makeApiRequestWithCosmosDB = async (
    question: string,
    conversationId?: string
  ) => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    setIsLoading(true);
    setShowLoadingMessage(true);
    const abortController = new AbortController();
    abortFuncs.current.unshift(abortController);

    const userMessage: ChatMessage = {
      id: uuid(),
      role: "user",
      content: question,
      date: new Date().toISOString(),
    };

    let request: ConversationRequest;
    let conversation;
    if (conversationId) {
      conversation = appStateContext?.state?.chatHistory?.find(
        (conv) => 
        {
          if (conv && conv.id){
            return conv.id === conversationId
          }
          console.log("oh noooooooooooo")
          return false;
        }
      );
      console.log("conversation",conversation)
      if (!conversation) {
        if(appStateContext?.state?.currentChat?.id == conversationId){
          setProcessMessages(messageStatus.Processing);
          if (resultConversation)
          appStateContext?.dispatch({
          type: "UPDATE_CURRENT_CHAT",
          payload: resultConversation,
          });
          setProcessMessages(messageStatus.Done);
          conversation = appStateContext?.state?.currentChat;
          conversation.messages.push(userMessage);
          request = {
            messages: [
              ...conversation.messages.filter((answer) => answer.role !== ERROR),
            ],
          };
        }
        else{
        console.error("Conversation not found.", conversationId);
        console.log(appStateContext?.state?.chatHistory)
        setIsLoading(false);
        setShowLoadingMessage(false);
        abortFuncs.current = abortFuncs.current.filter(
          (a) => a !== abortController
        );
        return;
      }
      } else {
        conversation.messages.push(userMessage);
        request = {
          messages: [
            ...conversation.messages.filter((answer) => answer.role !== ERROR),
          ],
        };
      }
    } else {
      request = {
        messages: [userMessage].filter((answer) => answer.role !== ERROR),
      };
      setMessages(request.messages);
    }
    let result = {} as ChatResponse;
    var errorResponseMessage =
      "Please try again. If the problem persists, please contact the site administrator.";
    try {
      let eventTest = await eventTrigger(userMessage["id"]);
      const response = conversationId
        ? await historyGenerate(request, abortController.signal, conversationId, appStateContext?.state.selectedVersion)
        : await historyGenerate(request, abortController.signal, undefined, appStateContext?.state.selectedVersion, ticketId);

      if (!response?.ok) {
        const responseJson = await response.json();
        errorResponseMessage =
          responseJson.error === undefined
            ? errorResponseMessage
            : parseErrorMessage(responseJson.error);
        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: `There was an error generating a response. Chat history can't be saved at this time. ${errorResponseMessage}`,
          date: new Date().toISOString(),
        };
        let resultConversation;
        if (conversationId) {
          resultConversation = appStateContext?.state?.chatHistory?.find(
            (conv) => 
              {
                if (conv && conv.id){
                  return conv.id === conversationId
                }
                console.log("oh noooooooooooo")
                return false;
              }
          );
          console.log("result convo", resultConversation);
          if (!resultConversation) {
            console.error("Conversation not found.");
            console.log(appStateContext?.state?.chatHistory)
            setIsLoading(false);
            setShowLoadingMessage(false);
            abortFuncs.current = abortFuncs.current.filter(
              (a) => a !== abortController
            );
            return;
          }
          resultConversation.messages.push(errorChatMsg);
        } else {
          setMessages([...messages, userMessage, errorChatMsg]);
          setIsLoading(false);
          setShowLoadingMessage(false);
          abortFuncs.current = abortFuncs.current.filter(
            (a) => a !== abortController
          );
          return;
        }
        appStateContext?.dispatch({
          type: "UPDATE_CURRENT_CHAT",
          payload: resultConversation,
        });
        setMessages([...resultConversation.messages]);
        return;
      }
      if (response?.body) {
        setProcessMessages(messageStatus.Processing);
        console.log(progressItems[userMessage["id"]],"Ok");
        const reader = response.body.getReader();

        let runningText = "";
        while (true) {
          setProcessMessages(messageStatus.Processing);
          const { done, value } = await reader.read();
          if (done) break;

          var text = new TextDecoder("utf-8").decode(value);
          const objects = text.split("\n");
          objects.forEach((obj) => {
            try {
              if (obj !== "" && obj !== "{}") {
                runningText += obj;
                result = JSON.parse(runningText);
                if (!result.choices?.[0]?.messages?.[0].content) {
                  errorResponseMessage = NO_CONTENT_ERROR;
                  throw Error();
                }
                if (result.choices?.length > 0) {
                  result.choices[0].messages.forEach((msg) => {
                    msg.id = result.id;
                    msg.date = new Date().toISOString();
                  });
                  if (
                    result.choices[0].messages?.some(
                      (m) => m.role === ASSISTANT
                    )
                  ) {
                    setShowLoadingMessage(false);
                  }
                  result.choices[0].messages.forEach((resultObj) => {
                    processResultMessage(
                      resultObj,
                      userMessage,
                      conversationId
                    );
                  });
                  conversationId = result.history_metadata.conversation_id
                }
                runningText = "";
              } else if (result.error) {
                throw SyntaxError(result.error);
              }
              else if (result.message) {
                 throw SyntaxError(result.message);
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) {
                console.error(e);
                throw e;
              } else {
                console.log("Incomplete message. Continuing...");
                
              }
            }
          });
        }

        resultConversation = appStateContext?.state?.chatHistory?.find(
          (conv) => 
            {
              if (conv && conv.id){
                return conv.id === conversationId
              }
              console.log("oh noooooooooooo")
              return false;
            }
        );
        if (resultConversation) {
          isEmpty(toolMessage)
            ? resultConversation.messages.push(assistantMessage)
            : resultConversation.messages.push(toolMessage, assistantMessage);
        } else {
          resultConversation = {
            id: conversationId ?? "",
            title: userMessage.content,
            messages: [userMessage],
            date: new Date().toISOString(),
          };
          isEmpty(toolMessage)
            ? resultConversation.messages.push(assistantMessage)
            : resultConversation.messages.push(toolMessage, assistantMessage);
        }
        if (!resultConversation) {
          setIsLoading(false);
          setShowLoadingMessage(false);
          abortFuncs.current = abortFuncs.current.filter(
            (a) => a !== abortController
          );
          return;
        }
        appStateContext?.dispatch({
          type: "UPDATE_CURRENT_CHAT",
          payload: resultConversation,
        });
        // isEmpty(toolMessage)
        //   ? setMessages([...messages, assistantMessage])
        //   : setMessages([...messages, toolMessage, assistantMessage]);
      }
      else{let errorChatMsg: ChatMessage = {
        id: uuid(),
        role: ERROR,
        content: "No body",
        date: new Date().toISOString(),
      };
      setMessages([...messages, errorChatMsg]);}
    } catch (e) {
      console.log(e);
      if (!abortController.signal.aborted) {
        let errorMessage = `An error occurred. ${errorResponseMessage}`;
        if (result.error?.message) {
          errorMessage = result.error.message;
        } else if (typeof result.error === "string") {
          errorMessage = result.error;
        }

        errorMessage = parseErrorMessage(errorMessage);

        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: errorMessage,
          date: new Date().toISOString(),
        };
        let resultConversation;
        if (conversationId) {
          resultConversation = appStateContext?.state?.chatHistory?.find(
            (conv) => 
              {
                if (conv && conv.id){
                  return conv.id === conversationId
                }
                console.log("oh noooooooooooo")
                return false;
              }
          );
          console.log(resultConversation)
          if (!resultConversation) {
            console.error("Conversation not found.");
            console.log(appStateContext?.state?.chatHistory)
            setIsLoading(false);
            setShowLoadingMessage(false);
            abortFuncs.current = abortFuncs.current.filter(
              (a) => a !== abortController
            );
            return;
          }
          resultConversation.messages.push(errorChatMsg);
        } else {
          if (!result.history_metadata) {
            console.error("Error retrieving data.", result);
            let errorChatMsg: ChatMessage = {
              id: uuid(),
              role: ERROR,
              content: errorMessage,
              date: new Date().toISOString(),
            };
            setMessages([...messages, userMessage, errorChatMsg]);
            setIsLoading(false);
            setShowLoadingMessage(false);
            abortFuncs.current = abortFuncs.current.filter(
              (a) => a !== abortController
            );
            return;
          }
          resultConversation = {
            id: result.history_metadata.conversation_id,
            title: result.history_metadata.title,
            messages: [userMessage],
            date: result.history_metadata.date,
          };
          resultConversation.messages.push(errorChatMsg);
        }
        if (!resultConversation) {
          setIsLoading(false);
          setShowLoadingMessage(false);
          abortFuncs.current = abortFuncs.current.filter(
            (a) => a !== abortController
          );
          return;
        }
        appStateContext?.dispatch({
          type: "UPDATE_CURRENT_CHAT",
          payload: resultConversation,
        });
        setMessages([...messages, errorChatMsg]);
      } else {
        console.log(e);
        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: "Error Occured",
          date: new Date().toISOString(),
        };
        setMessages([...messages, errorChatMsg]);
      }
    } finally {
      setIsLoading(false);
      setShowLoadingMessage(false);
      abortFuncs.current = abortFuncs.current.filter(
        (a) => a !== abortController
      );
      setProcessMessages(messageStatus.Done);
    }
    return abortController.abort();
  };

  const clearChat = async () => {
    setClearingChat(true);
    if (
      appStateContext?.state.currentChat?.id &&
      appStateContext?.state.isCosmosDBAvailable.cosmosDB
    ) {
      let response = await historyClear(appStateContext?.state.currentChat.id);
      if (!response.ok) {
        setErrorMsg({
          title: "Error clearing current chat",
          subtitle:
            "Please try again. If the problem persists, please contact the site administrator.",
        });
        toggleErrorDialog();
      } else {
        appStateContext?.dispatch({
          type: "DELETE_CURRENT_CHAT_MESSAGES",
          payload: appStateContext?.state.currentChat.id,
        });
        appStateContext?.dispatch({
          type: "UPDATE_CHAT_HISTORY",
          payload: appStateContext?.state.currentChat,
        });
        setActiveCitation(undefined);
        setIsCitationPanelOpen(false);
        setMessages([]);
      }
    }
    setClearingChat(false);
  };

  const parseErrorMessage = (errorMessage: string) => {
    let errorCodeMessage = errorMessage.substring(
      0,
      errorMessage.indexOf("-") + 1
    );
    const innerErrorCue = "{\\'error\\': {\\'message\\': ";
    if (errorMessage.includes(innerErrorCue)) {
      try {
        let innerErrorString = errorMessage.substring(
          errorMessage.indexOf(innerErrorCue)
        );
        if (innerErrorString.endsWith("'}}")) {
          innerErrorString = innerErrorString.substring(
            0,
            innerErrorString.length - 3
          );
        }
        innerErrorString = innerErrorString.replaceAll("\\'", "'");
        let newErrorMessage = errorCodeMessage + " " + innerErrorString;
        errorMessage = newErrorMessage;
      } catch (e) {
        console.error("Error parsing inner error message: ", e);
      }
    }
    return errorMessage;
  };

  const newChat = () => {
    setProcessMessages(messageStatus.Processing);
    setMessages([]);
    setIsCitationPanelOpen(false);
    setActiveCitation(undefined);
    appStateContext?.dispatch({ type: "UPDATE_CURRENT_CHAT", payload: null });
    setProcessMessages(messageStatus.Done);
  };

  const stopGenerating = () => {
    abortFuncs.current.forEach((a) => a.abort());
    setShowLoadingMessage(false);
    setIsLoading(false);
  };

  useEffect(() => {
    if (appStateContext?.state.currentChat) {
      console.log("messages -------------", appStateContext.state.currentChat.messages)
      setMessages(appStateContext.state.currentChat.messages);
    } else {
      setMessages([]);
    }
  }, [appStateContext?.state.currentChat]);

  useEffect(() => {
    const saveToDB = async (messages: ChatMessage[], id: string) => {
      const response = await historyUpdate(messages, id);
      return response;
    };

    if (
      appStateContext &&
      appStateContext.state.currentChat &&
      processMessages === messageStatus.Done
    ) {
      if (appStateContext.state.isCosmosDBAvailable.cosmosDB) {
        if (!appStateContext?.state.currentChat?.messages) {
          console.error("Failure fetching current chat state.");
          return;
        }
        const noContentError = appStateContext.state.currentChat.messages.find(
          (m) => m.role === ERROR
        );

        if (!noContentError?.content.includes(NO_CONTENT_ERROR)) {
          saveToDB(
            appStateContext.state.currentChat.messages,
            appStateContext.state.currentChat.id
          )
            .then((res) => {
              if (!res.ok) {
                let errorMessage =
                  "An error occurred. Answers can't be saved at this time. If the problem persists, please contact the site administrator.";
                let errorChatMsg: ChatMessage = {
                  id: uuid(),
                  role: ERROR,
                  content: errorMessage,
                  date: new Date().toISOString(),
                };
                if (!appStateContext?.state.currentChat?.messages) {
                  let err: Error = {
                    ...new Error(),
                    message: "Failure fetching current chat state.",
                  };
                  throw err;
                }
                setMessages([
                  ...appStateContext?.state.currentChat?.messages,
                  errorChatMsg,
                ]);
              }
              return res as Response;
            })
            .catch((err) => {
              console.error("Error: ", err);
              let errRes: Response = {
                ...new Response(),
                ok: false,
                status: 500,
              };
              return errRes;
            });
        }
      } else {
      }
      appStateContext?.dispatch({
        type: "UPDATE_CHAT_HISTORY",
        payload: appStateContext.state.currentChat,
      });
      setMessages(appStateContext.state.currentChat.messages);
      setProcessMessages(messageStatus.NotRunning);
    }
  }, [processMessages]);

  useEffect(() => {
    if (AUTH_ENABLED !== undefined) getUserInfoList();
  }, [AUTH_ENABLED]);


  useEffect(() => {
    if (userDetails !== undefined) getUserAccessDetails();
  }, [userDetails]);

  useLayoutEffect(() => {
    chatMessageStreamEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [showLoadingMessage, processMessages, progressItems]);

  const onShowCitation = (citation: Citation) => {
    setActiveCitation(citation);
    setIsCitationPanelOpen(true);
  };

  const onViewSource = (citation: Citation) => {
    if (citation.url && !citation.url.includes("blob.core")) {
      window.open(citation.url, "_blank");
    }
  };

  const parseCitationFromMessage = (message: ChatMessage) => {
   
      if (message?.role && message?.role === "tool") {
        try {
          const toolMessage = JSON.parse(message.content) as ToolMessageContent;
                  return toolMessage.citations;
        } catch {
          return [];
        }
      }
    return [];
  };

  const disabledButton = () => {
    return (
      isLoading ||
      (messages && messages.length === 0) ||
      clearingChat ||
      appStateContext?.state.chatHistoryLoadingState ===
        ChatHistoryLoadingState.Loading
    );
  };

  const menuProps: IContextualMenuProps = {
    items: [
      {
        key: "uploadImage",
        text: "Add image",
        iconProps: { iconName: "CloudUpload" },
      },
      {
        key: "uploadFile",
        text: "Add file",
        iconProps: { iconName: "Upload" },
      },
    ],
  };

  const actionButton = () => {
    toggleErrorDialog();
    setTimeout(() => {
      setErrorMsg(null);
    }, 500);
  };
  

  return (
    <div className={styles.container} role="main">
      {showAuthMessage ? (
        <Stack className={styles.chatEmptyState}>
          <ShieldLockRegular
            className={styles.chatIcon}
            style={{ color: "darkorange", height: "200px", width: "200px" }}
          />
          <h1 className={styles.chatEmptyStateTitle}>
            Authentication Not Configured
          </h1>
          <h2 className={styles.chatEmptyStateSubtitle}>
            This app does not have authentication configured. Please add an
            identity provider by finding your app in the{" "}
            <a href="https://portal.azure.com/" target="_blank">
              Azure Portal
            </a>
            and following{" "}
            <a
              href="https://learn.microsoft.com/en-us/azure/app-service/scenario-secure-app-authentication-app-service#3-configure-authentication-and-authorization"
              target="_blank"
            >
              these instructions
            </a>
            .
          </h2>
          <h2
            className={styles.chatEmptyStateSubtitle}
            style={{ fontSize: "20px" }}
          >
            <strong>
              Authentication configuration takes a few minutes to apply.{" "}
            </strong>
          </h2>
          <h2
            className={styles.chatEmptyStateSubtitle}
            style={{ fontSize: "20px" }}
          >
            <strong>
              If you deployed in the last 10 minutes, please wait and reload the
              page after 10 minutes.
            </strong>
          </h2>
        </Stack>
      ) : showAccessMessage ? (
        <Stack className={styles.chatEmptyState}>
            <ShieldProhibitedRegular className={styles.chatIcon} style={{ color: 'red', height: "200px", width: "200px" }} />
            <h1 className={styles.chatEmptyStateTitle}>Unauthorized Access</h1>
            <h2 className={styles.chatEmptyStateSubtitle}>
                You're not authorized to access this page. Please contact the application administrator. 
            </h2>
        </Stack>
     ) : (
        <Stack data-is-scrollable={true} horizontal className={styles.chatRoot}>
          {/* <div>
                        { selectedOption }
                        <br/>
                        <DropBox />

                    </div> */}

          <div data-is-scrollable={true} className={styles.chatContainer}>
            {!messages || messages.length < 1 ? (
                <Stack className={styles.chatEmptyState}>
                <img
                  src={ui?.chat_logo ? ui.chat_logo : Contoso}
                  className={styles.chatIcon}
                  aria-hidden="true"
                />
                <br />
                <div className={styles.avatarHtmlGrid}>
                  <div className={styles.gridEmpty}></div>
                  <div className={styles.gridAvatar}>
                    <Link to="/about" style={{textDecoration: "none"}}>
                      <img
                        src={RochelleAvatar}
                        alt="Rochelle Avatar"
                        className={styles.avatarImage}
                      />
                    </Link>
                  </div>
                  <div className={styles.gridHtml}>
                    <div
                      className={styles.chatEmptyStateSubtitle}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(ui?.chat_description || "", {
                          ALLOWED_TAGS: XSSAllowTags,
                        }),
                      }}
                    />
                  </div>
                  <div className={styles.gridEmpty}></div>
                </div>
              </Stack>
            ) : (
              <div
              data-is-scrollable={true}
                className={styles.chatMessageStream}
                style={{ marginBottom: isLoading ? "40px" : "0px" }}
                role="log"
              >
                {messages.map((answer, index) => (
                  <>
                    {answer.role === "user" ? (
                      <div className={styles.chatMessageUser} tabIndex={0}>
                        <div className={styles.chatMessageUserMessage}>
                          {answer.content}
                        </div>
                      </div>
                    ) : answer.role === "assistant" ? (
                      <div data-is-scrollable={true} className={styles.chatMessageGpt}>
                        <img src={RochelleAvatar} alt="Rochelle Avatar" style={{height: "80px"}} className={styles.messageAvatar} />
                        <Answer
                          answer={{
                            answer: answer.content,
                            citations: answer.citations != null ? parseCitationFromMessage(answer.citations) : parseCitationFromMessage(
                              messages[index - 1]
                            ),
                            message_id: answer.id,
                            feedback: answer.feedback,
                            events:answer.events,
                            actions:answer.actions
                          }}
                          onHandleCopyChat={() => onHandleCopyChats(answer.content)}
                          onCitationClicked={(c) => onShowCitation(c)}
                          isLoading={false}
                          progressItems={
                            messages[index - 2] &&
                            messages[index - 2].role == "user"
                              ? progressItems[messages[index - 2].id]
                              : messages[index - 1] &&
                                messages[index - 1].role == "user"
                              ? progressItems[messages[index - 1].id]
                              : []
                          }
                        />
                      </div>
                    ) : answer.role === ERROR ? (
                      // <div className={styles.chatMessageError}>
                      //  {/* <Stack
                      //     horizontal
                      //     className={styles.chatMessageErrorContent}
                      //   >
                      //      <ErrorCircleRegular
                      //       className={styles.errorIcon}
                      //       style={{ color: "rgba(182, 52, 67, 1)" }}
                      //     />
                      //     <span>Error</span> --> 
                      //   </Stack> */}
                      //   <span className={styles.chatMessageErrorContent}>
                      //     {/* {answer.content} */}
                      //     Uh ho, I am unable to answer this question right now. Please try again after sometime. If the issue persist, Kindly contact Administrator
                      //   </span>
                      // </div>
                        <>
                    <div className={styles.chatMessageGpt}>
                      <img src={RochelleAvatar} alt="Rochelle Avatar" style={{height: "80px"}} className={styles.messageAvatar} />
                      <Answer
                        answer={{
                          answer: "Uh ho, I am unable to answer this question right now. Please try again after sometime. If the issue persist, Kindly contact Administrator with the follow message : " + answer.content,
                          citations: [],
                        }}
                        onHandleCopyChat={() => null}
                        onCitationClicked={() => null}
                        isLoading={showLoadingMessage}
                        progressItems={
                          progressItems
                            ? progressItems[messages[messages.length - 2].id]
                            : []
                        }
                      />
                    </div>
                    </>
                    ) : null}
                  </>
                ))}
                {showLoadingMessage && progressItems && (
                  <>
                    <div className={styles.chatMessageGpt}>
                    <img src={RochelleAvatar} alt="Rochelle Avatar" style={{height: "80px"}} className={styles.messageAvatar}/>
                      <Answer
                        answer={{
                          answer: "",
                          citations: [],
                        }}
                        onHandleCopyChat={() => null}
                        onCitationClicked={() => null}
                        isLoading={showLoadingMessage}
                        progressItems={
                          progressItems
                            ? progressItems[messages[messages.length - 1].id]
                            : []
                        }
                      />
                    </div>
                  </>
                )}
                <div ref={chatMessageStreamEnd} />
              </div>
            )}

            <Stack horizontal className={styles.chatInput}>
              {isLoading && (
                <Stack
                  horizontal
                  className={styles.stopGeneratingContainer}
                  role="button"
                  aria-label="Stop generating"
                  tabIndex={0}
                  onClick={stopGenerating}
                  onKeyDown={(e) =>
                    e.key === "Enter" || e.key === " " ? stopGenerating() : null
                  }
                >
                  <SquareRegular
                    className={styles.stopGeneratingIcon}
                    aria-hidden="true"
                  />
                  <span
                    className={styles.stopGeneratingText}
                    aria-hidden="true"
                  >
                    Stop generating
                  </span>
                </Stack>
              )}
              <Stack>
                {appStateContext?.state.isCosmosDBAvailable?.status !==
                  CosmosDBStatus.NotConfigured && (
                  <CommandBarButton
                    role="button"
                    styles={{
                      icon: {
                        // color: '#FFFFFF',
                        color: "#000000",
                      },
                      iconDisabled: {
                        color: "#BDBDBD !important",
                      },
                      root: {
                        // color: '#FFFFFF',
                        color: "#000000",
                        // background: "radial-gradient(109.81% 107.82% at 100.1% 90.19%, #0F6CBD 33.63%, #2D87C3 70.31%, #8DDDD8 100%)"
                        background:
                          "radial-gradient(109.81% 107.82% at 100.1% 90.19%, #FFD20A 33.63%, #f4e6a9 70.31%, #f7f0d1 100%)",
                      },
                      rootDisabled: {
                        background: "#F0F0F0",
                      },
                    }}
                    className={styles.newChatIcon}
                    iconProps={{ iconName: "Add" }}
                    onClick={newChat}
                    disabled={disabledButton()}
                    aria-label="start a new chat button"
                  />
                )}
                <CommandBarButton
                  role="button"
                  styles={{
                    icon: {
                      // color: '#FFFFFF',
                      color: "#000000",
                    },
                    iconDisabled: {
                      color: "#BDBDBD !important",
                    },
                    root: {
                      // color: '#FFFFFF',
                      color: "#000000",
                      // background: "radial-gradient(109.81% 107.82% at 100.1% 90.19%, #0F6CBD 33.63%, #2D87C3 70.31%, #8DDDD8 100%)"
                      background:
                        "radial-gradient(109.81% 107.82% at 100.1% 90.19%, #FFD20A 33.63%, #f4e6a9 70.31%, #f7f0d1 100%)",
                    },
                    rootDisabled: {
                      background: "#F0F0F0",
                    },
                  }}
                  className={
                    appStateContext?.state.isCosmosDBAvailable?.status !==
                    CosmosDBStatus.NotConfigured
                      ? styles.clearChatBroom
                      : styles.clearChatBroomNoCosmos
                  }
                  iconProps={{ iconName: "Broom" }}
                  onClick={
                    appStateContext?.state.isCosmosDBAvailable?.status !==
                    CosmosDBStatus.NotConfigured
                      ? clearChat
                      : newChat
                  }
                  disabled={disabledButton()}
                  aria-label="clear chat button"
                />
                {/* <CommandBarButton
                                    role="button"
                                    className={ styles.clearChatBroom }
                                    iconProps={{ iconName: 'Add' }}
                                    menuProps={menuProps}
                                    onClick={actionButton}
                                    aria-label="Upload image"
                                /> */}
                <Dialog
                  hidden={hideErrorDialog}
                  onDismiss={handleErrorDialogClose}
                  dialogContentProps={errorDialogContentProps}
                  modalProps={modalProps}
                ></Dialog>
              </Stack>
              <QuestionInput
                clearOnSend
                placeholder="Type a new question..."
                disabled={isLoading}
                onSend={(question, id) => {
                  appStateContext?.state.isCosmosDBAvailable?.cosmosDB
                    ? makeApiRequestWithCosmosDB(question, id)
                    : makeApiRequestWithoutCosmosDB(question, id);
                }}
                conversationId={
                  appStateContext?.state.currentChat?.id
                    ? appStateContext?.state.currentChat?.id
                    : undefined
                }
              />
            </Stack>
          </div>
          {/* Citation Panel */}
          {messages &&
            messages.length > 0 &&
            isCitationPanelOpen &&
            activeCitation && (
              <Stack.Item
                className={styles.citationPanel}
                tabIndex={0}
                role="tabpanel"
                aria-label="Citations Panel"
              >
                <Stack
                  aria-label="Citations Panel Header Container"
                  horizontal
                  className={styles.citationPanelHeaderContainer}
                  horizontalAlign="space-between"
                  verticalAlign="center"
                >
                  <span
                    aria-label="Citations"
                    className={styles.citationPanelHeader}
                  >
                    Citations
                  </span>
                  <IconButton
                    iconProps={{ iconName: "Cancel" }}
                    aria-label="Close citations panel"
                    onClick={() => setIsCitationPanelOpen(false)}
                  />
                </Stack>
                <h5
                  className={styles.citationPanelTitle}
                  tabIndex={0}
                  title={
                    activeCitation.url &&
                    !activeCitation.url.includes("blob.core")
                      ? activeCitation.url
                      : activeCitation.title ?? ""
                  }
                  onClick={() => onViewSource(activeCitation)}
                >
                  {activeCitation.title}
                </h5>
                {(() => {
                  switch (activeCitation.source) {
                    case 'product_manual':
                      return (
                        <iframe
                          src={activeCitation.url ? activeCitation.url + (activeCitation.page_num ? "#page=" + activeCitation.page_num : "") : ""}
                          className={styles.citationPanelPdf}
                          title={activeCitation.title || ""}
                        />
                      );
                    case 'product_information':
                      return <ProductInfoLayout item={activeCitation.contentJson} citationUrl={activeCitation.url || undefined} />;
                    case 'product_parts':
                      return <ProductPartsLayout item={activeCitation.contentJson} />;
                    case 'license_information':
                      return <LicenseInformationLayout item={activeCitation.contentJson} />;
                    case 'order_details':
                      return <OrderDetailsLayout item={activeCitation.contentJson} />;
                    case 'inventory_status':
                      return <InventoryStatusLayout item={activeCitation.contentJson} />;
                    case 'where_to_buy':
                      return <WhereToBuyLayout item={activeCitation.contentJson} />;
                    default:
                      return activeCitation.title?.toLowerCase().endsWith('.pdf') ? (
                        <iframe
                          src={activeCitation.url ? activeCitation.url + (activeCitation.page_num ? "#page=" + activeCitation.page_num : "") : ""}
                          className={styles.citationPanelPdf}
                          title={activeCitation.title}
                        />
                      ) : (
                        <div tabIndex={0}>
                          <ReactMarkdown
                            linkTarget="_blank"
                            className={styles.citationPanelContent}
                            children={DOMPurify.sanitize(activeCitation.content, {
                              ALLOWED_TAGS: XSSAllowTags,
                            })}
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                          />
                        </div>
                      );
                  }
                })()}
              </Stack.Item>
            )}
            
          {appStateContext?.state.isChatHistoryOpen &&
            appStateContext?.state.isCosmosDBAvailable?.status !==
              CosmosDBStatus.NotConfigured && <ChatHistoryPanel />}
        </Stack>
      )}
    </div>
  );
};

export default Chat;
