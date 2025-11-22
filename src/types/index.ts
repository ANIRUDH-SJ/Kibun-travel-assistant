export interface Location{
    lat: number;
    lon: number;
    name: string;
}

export interface Message{
    role: 'user' | 'assistant';
    content: string;
    locations?: Location[];
}

export interface WeatherData{
    temp: number;
    description: string;
    icon: string;
}