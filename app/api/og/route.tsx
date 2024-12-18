import { ImageResponse } from 'next/server'
import { generateText } from 'ai'
import { groq } from '@ai-sdk/groq'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const answer = searchParams.get('answer')

  if (!answer) {
    return new Response('Missing answer parameter', { status: 400 })
  }

  try {
    const { text: rebus } = await generateText({
      model: groq('mixtral-8x7b-32768'),
      prompt: `Generate a simple rebus puzzle for the word or phrase "${answer}". Describe the visual elements that would make up this rebus, using simple shapes, letters, and symbols. The description should be concise and easy to visualize.`,
    })

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a1a',
            fontSize: 32,
            fontWeight: 600,
          }}
        >
          <div style={{ color: '#ffffff', marginBottom: 20 }}>Rebuzzle Challenge</div>
          <div style={{ color: '#9333ea', marginBottom: 40, textAlign: 'center', fontSize: 48 }}>{rebus}</div>
          <div style={{ color: '#ffffff', fontSize: 24 }}>Can you solve today's puzzle?</div>
          <div style={{ color: '#9333ea', marginTop: 20, fontSize: 20 }}>Play now at rebuzzle.com</div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('Error generating OG image:', error)
    return new Response('Error generating OG image', { status: 500 })
  }
}

