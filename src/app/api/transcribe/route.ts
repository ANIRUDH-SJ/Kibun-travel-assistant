import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({apiKey: process.env.GROQ_API_KEY});
export async function POST(req: NextRequest){
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if(!file) return NextResponse.json({error: 'No file uploaded'},{status:400});
    try{
        const transcription = await groq.audio.transcriptions.create({
            file:file,
            model:'whisper-large-v3',
            response_format:'json',
        });
        return NextResponse.json({text:transcription.text});
    }catch(error){
        console.error(error);
        return NextResponse.json({error:'Transcription failed'},{status:500});
    }
}