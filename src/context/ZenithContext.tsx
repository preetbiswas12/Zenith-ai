import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { ZenithState, Conversation, Message } from '../types';

interface ZenithContextProps extends ZenithState {
  createNewConversation: () => void;
  setActiveConversation: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  clearConversation: () => void;
  setApiKey: (key: string) => void;
}

type ZenithAction =
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: string }
  | { type: 'CREATE_CONVERSATION'; payload: Conversation }
  | { type: 'ADD_MESSAGE'; payload: { conversationId: string; message: Message } }
  | { type: 'CLEAR_CONVERSATION' }
  | { type: 'SET_API_KEY'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: ZenithState = {
  conversations: [],
  activeConversationId: null,
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  loading: false,
};

function zenithReducer(state: ZenithState, action: ZenithAction): ZenithState {
  switch (action.type) {
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversationId: action.payload };
    case 'CREATE_CONVERSATION': {
      const newConversations = [...state.conversations, action.payload];
      return {
        ...state,
        conversations: newConversations,
        activeConversationId: action.payload.id,
      };
    }
    case 'ADD_MESSAGE': {
      const { conversationId, message } = action.payload;
      const updatedConversations = state.conversations.map((conversation) => {
        if (conversation.id === conversationId) {
          const updatedMessages = [...conversation.messages, message];
          return {
            ...conversation,
            messages: updatedMessages,
            updatedAt: new Date(),
            title: conversation.title === 'New conversation' && updatedMessages.length === 1
              ? `${message.content.slice(0, 30)}...`
              : conversation.title,
          };
        }
        return conversation;
      });
      return { ...state, conversations: updatedConversations };
    }
    case 'CLEAR_CONVERSATION': {
      if (!state.activeConversationId) return state;
      const updatedConversations = state.conversations.map((conversation) => {
        if (conversation.id === state.activeConversationId) {
          return {
            ...conversation,
            messages: [],
            updatedAt: new Date(),
          };
        }
        return conversation;
      });
      return { ...state, conversations: updatedConversations };
    }
    case 'SET_API_KEY':
      return { ...state, apiKey: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

const ZenithContext = createContext<ZenithContextProps | undefined>(undefined);

export function ZenithProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(zenithReducer, initialState);

  useEffect(() => {
    // Load conversations from localStorage
    const savedConversations = localStorage.getItem('zenith-conversations');
    const savedApiKey = localStorage.getItem('zenith-api-key');

    if (savedConversations) {
      const parsedConversations = JSON.parse(savedConversations).map((convo: any) => ({
        ...convo,
        createdAt: new Date(convo.createdAt),
        updatedAt: new Date(convo.updatedAt),
        messages: convo.messages.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        })),
      }));
      dispatch({ type: 'SET_CONVERSATIONS', payload: parsedConversations });

      if (parsedConversations.length > 0) {
        dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: parsedConversations[0].id });
      }
    }

    if (savedApiKey) {
      dispatch({ type: 'SET_API_KEY', payload: savedApiKey });
    }
  }, []);

  useEffect(() => {
    // Save conversations to localStorage when state changes
    if (state.conversations.length > 0) {
      localStorage.setItem('zenith-conversations', JSON.stringify(state.conversations));
    }
  }, [state.conversations]);

  useEffect(() => {
    // Save API key to localStorage
    if (state.apiKey) {
      localStorage.setItem('zenith-api-key', state.apiKey);
    }
  }, [state.apiKey]);

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: nanoid(),
      title: 'New conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dispatch({ type: 'CREATE_CONVERSATION', payload: newConversation });
  };

  const setActiveConversation = (id: string) => {
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: id });
  };

  const sendMessage = async (content: string) => {
    if (!state.activeConversationId) {
      createNewConversation();
    }
    
    const conversationId = state.activeConversationId || state.conversations[state.conversations.length - 1].id;
    
    // Add user message
    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content,
      createdAt: new Date(),
    };
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: { conversationId, message: userMessage },
    });
    
    // Set loading state
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      if (!state.apiKey) {
        throw new Error('Please set your Gemini API key in the settings');
      }
      
      const activeConversation = state.conversations.find(c => c.id === conversationId);
      if (!activeConversation) return;
      
      const messages = activeConversation.messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      
      messages.push({ role: 'user', content });
      
      const response = await fetch(import.meta.env.VITE_GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: import.meta.env.VITE_GEMINI_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 1000
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get response from Gemini API');
      }
      
      const assistantMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: data.choices[0].message.content,
        createdAt: new Date()
      };
      
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { conversationId, message: assistantMessage }
      });
    } catch (error) {
      const errorMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        createdAt: new Date(),
      };
      
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { conversationId, message: errorMessage },
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearConversation = () => {
    dispatch({ type: 'CLEAR_CONVERSATION' });
  };

  const setApiKey = (key: string) => {
    dispatch({ type: 'SET_API_KEY', payload: key });
  };

  return (
    <ZenithContext.Provider
      value={{
        ...state,
        createNewConversation,
        setActiveConversation,
        sendMessage,
        clearConversation,
        setApiKey,
      }}
    >
      {children}
    </ZenithContext.Provider>
  );
}

export function useZenith() {
  const context = useContext(ZenithContext);
  if (context === undefined) {
    throw new Error('useZenith must be used within a ZenithProvider');
  }
  return context;
}