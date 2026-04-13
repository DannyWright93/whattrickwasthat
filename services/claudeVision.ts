import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export type TrickStyle = 'Sketchy' | 'Decent' | 'Clean' | 'Textbook' | 'Gnarly';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface TrickAnalysis {
  trickName: string;
  description: string;
  style: TrickStyle;
  confidence: ConfidenceLevel;
}

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';

const TRICK_PROMPT = `You are an expert skateboarding trick analyzer. You are shown a single still frame extracted from a skate clip. Your job is to identify the trick — but ONLY if the visual evidence clearly supports it.

IMPORTANT RULES:
- If the frame is blurry, mid-air with no distinguishing board position, or you cannot clearly see the skater's feet and board orientation, use trickName "Unknown Trick" and confidence "low".
- Do NOT guess or infer a trick name from context. Only name a trick if you can see clear visual evidence (board rotation, foot position, grind contact, etc.).
- A single frame mid-trick is often ambiguous — it is better to say "Unknown Trick" than to name the wrong trick with confidence.

Visual cues to look for:
- Ollie: board and skater both airborne, board mostly flat, feet on board
- Kickflip: board rotating heelside-to-toeside (along the length axis) mid-air
- Heelflip: board rotating toeside-to-heelside (opposite of kickflip)
- 360 Flip (Tre Flip): board spinning 360° AND flipping simultaneously
- Pop Shove-it: board rotating 180° horizontally, no flip, feet off board
- Varial Flip: pop shove-it + kickflip combined
- Nosegrind: front truck grinding a ledge/rail, back truck in the air, board parallel to obstacle
- 50-50 Grind: both trucks grinding, board parallel to the ledge/rail
- 5-0 Grind: back truck only grinding, front truck in the air, board parallel to obstacle
- Boardslide: board is PERPENDICULAR (sideways, ~90°) to the obstacle, sliding along it — skater's body faces along the rail, neither truck is on the obstacle
- Noseslide: board PERPENDICULAR to obstacle but the NOSE (front of board) is the contact point, tail in the air
- Crooked Grind (Crooks): front truck grinding BUT the board is at an ANGLE (not parallel, not perpendicular) — nose is angled down and away, creating a diagonal. Distinguished from boardslide by truck contact; distinguished from nosegrind by the angled board position
- Smith Grind: back truck grinding, board angled so the nose tilts toward the obstacle
- Manual: back wheels only on ground, front wheels raised, rolling
- Nollie/Fakie: variations indicated by stance direction

Grab tricks — identified by which hand grabs which part of the board:
- Melon Grab: back hand grabs the toeside (front edge) of the board between the trucks
- Indy Grab: back hand grabs the toeside of the board between the trucks (very similar to Melon — Indy is grabbed with arm crossing in front, Melon with arm behind)
- Stalefish: back hand grabs the heelside (back edge) of the board behind the back leg
- Mute Grab: front hand grabs the toeside of the board between the trucks
- Nosegrab: front hand grabs the nose of the board
- Tailgrab: back hand grabs the tail of the board
- Benihana: back hand grabs the tail while the back foot kicks off the board
- Stiffy / Madonna: body position fully extended or one leg off the board during grab
- If a grab is combined with a flip trick (e.g. kickflip Indy), name both components

Respond ONLY with a valid JSON object — no markdown, no explanation, just raw JSON:
{
  "trickName": "Specific trick name, or 'Unknown Trick' if unclear",
  "description": "1-2 sentences describing what you can see in the frame and why you identified this trick (or why it's unclear)",
  "style": "One of exactly: Sketchy | Decent | Clean | Textbook | Gnarly",
  "confidence": "One of exactly: high | medium | low"
}

Style guide:
- Sketchy: barely landed, wobbly, near bail
- Decent: landed but not the cleanest
- Clean: solid, controlled landing
- Textbook: perfect form and execution
- Gnarly: insane trick, massive gap, or exceptional difficulty`;

export async function extractFrame(videoUri: string, timeMs = 500): Promise<string> {
  const { uri: rawUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
    time: timeMs,
    quality: 1,
  });

  // Shrink to 768px wide at 60% quality — keeps payload under ~150KB base64
  const resized = await ImageManipulator.manipulate(rawUri)
    .resize({ width: 768 })
    .renderAsync()
    .then((r) => r.saveAsync({ compress: 0.6, format: SaveFormat.JPEG }));

  const base64 = await FileSystem.readAsStringAsync(resized.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return base64;
}

export async function analyzeTrick(videoUri: string, timeMs = 500): Promise<TrickAnalysis> {
  const base64Image = await extractFrame(videoUri, timeMs);

  const requestBody = JSON.stringify({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
          {
            type: 'text',
            text: TRICK_PROMPT,
          },
        ],
      },
    ],
  });

  let response: Response | null = null;
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: requestBody,
      });
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[Groq] attempt ${attempt} failed:`, err);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  if (!response) {
    throw new Error(`Network error after 3 attempts: ${lastError}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content ?? '';

  const cleaned = content.replace(/```(?:json)?/g, '').trim();
  const parsed: TrickAnalysis = JSON.parse(cleaned);

  if (!parsed.trickName || !parsed.description || !parsed.style || !parsed.confidence) {
    throw new Error('Incomplete response from AI');
  }

  return parsed;
}
