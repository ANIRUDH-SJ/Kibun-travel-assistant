import { create } from 'zustand';
import { Message, Location } from '@/types';

interface AppState{
    language: 'en' | 'jp';
    messages: Message[];
    mapLocation: Location | null; //for the map to locate 
    setLanguage: (lang: 'en' | 'jp')=>void;
    addMessage: (msg:Message) => void;
    setMapLocation: (loc:Location) => void;
}

export const useStore = create<AppState>((set)=>({
    language: 'en',
    messages: [],
    mapLocation: {lat:35.6762,lon:139.6503,name: 'Tokyo'},
    setLanguage: (lang) => set({language:lang}),
    addMessage: (msg)=> set((state)=>({messages:[...state.messages,msg]})),
    setMapLocation: (loc) => set({mapLocation:loc}),
}));