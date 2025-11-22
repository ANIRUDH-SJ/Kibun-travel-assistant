//v4
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getWeather(location: string) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    try {
        let geoRes = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`);
        let geoData = await geoRes.json();

        if (!geoData || geoData.length === 0) {
            // Fallback to Tokyo if specific location fails
            geoRes = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=Tokyo,JP&limit=1&appid=${apiKey}`);
            geoData = await geoRes.json();
        }

        if (!geoData || geoData.length === 0) return null;

        const { lat, lon, name } = geoData[0];
        const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
        const weatherData = await weatherRes.json();
        
        return {
            locationName: location,
            weatherLocation: name,
            lat,
            lon,
            temp: weatherData.main.temp,
            condition: weatherData.weather[0].description,
        };
    } catch (e) {
        console.error("Weather Fetch Error:", e);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const { message, history, language } = await req.json();

        const langInstruction = language === 'en' 
            ? 'Respond ONLY in English.' 
            : 'Respond ONLY in Japanese (日本語).';

        //system prompt with separator to give map data separation
        const systemPrompt = `
            You are a Japan Travel & Style Assistant. 
            ${langInstruction}
            
            You MUST call the 'get_weather' tool if the user mentions a specific location.
            Answer the user's question naturally.
            
            CRITICAL: If you are recommending a location, you MUST append the coordinates at the very end using this exact format:
            
            ___MAP_DATA___
            { "locations": [{ "name": "Place Name", "lat": 123.45, "lon": 123.45 }] }
            
            Do not add Markdown or formatting code blocks around the JSON. Just the separator and the JSON.
        `;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: message }
        ];

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: 'llama-3.3-70b-versatile',
            tools: [{
                type: 'function',
                function: {
                    name: 'get_weather',
                    description: 'Get current weather for a city in Japan',
                    parameters: {
                        type: 'object',
                        properties: {
                            location: { type: 'string', description: 'City name (e.g. Tokyo, Kyoto)' }
                        },
                        required: ['location']
                    }
                }
            }],
            tool_choice: 'auto'
        });

        const responseMessage = completion.choices[0].message;

        if (responseMessage.tool_calls) {
            const toolCall = responseMessage.tool_calls[0];
            
            if (toolCall.function.name === 'get_weather') {
                let args;
                try {
                    args = JSON.parse(toolCall.function.arguments);
                } catch (e) {
                    args = { location: "Tokyo" }; 
                }

                const weatherData = await getWeather(args.location);

                const secondResponse = await groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        ...messages,
                        responseMessage,
                        {
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: weatherData ? JSON.stringify(weatherData) : JSON.stringify({ error: "Weather data unavailable." })
                        }
                    ]
                });

                return NextResponse.json({
                    reply: secondResponse.choices[0].message.content
                });
            }
        }

        return NextResponse.json({ reply: responseMessage.content });

    } catch (error) {
        console.error("API Critical Error:", error);
        return NextResponse.json({ 
            reply: "Sorry, I'm having trouble connecting right now." 
        });
    }
}
